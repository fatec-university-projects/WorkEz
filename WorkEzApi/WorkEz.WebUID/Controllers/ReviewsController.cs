using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Infra.Data.Context;
using WorkEz.WebUID.Auth;

namespace WorkEz.WebUID.Controllers;

public record CreateReviewRequest(
    Guid? AppointmentId,
    Guid? ReviewedUserId,
    int Rating,
    string? Comment,
    Guid? ServiceId = null
);

public record ReviewDto(
    Guid Id,
    string ClientName,
    string? ClientPhoto,
    int Rating,
    string? Comment,
    DateTime CreatedAt
);

/// <summary>
/// Controlador para registro e consulta de avaliações reais pós-atendimento.
/// Consumido por WorkEzApp/app/client/rating/[id].tsx e provider/ratings.tsx.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ReviewsController(AppDbContext db) : ControllerBase
{
    /// <summary>
    /// Registra avaliação real de um serviço/prestador pelo cliente.
    /// POST /api/Reviews/by-customer/{customerId}
    /// </summary>
    [HttpPost("by-customer/{customerId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateReview(Guid customerId, [FromBody] CreateReviewRequest request)
    {
        if (request.Rating < 1 || request.Rating > 5)
            return BadRequest(new { message = "A nota deve ser entre 1 e 5 estrelas." });

        var customer = await db.Customers.Include(c => c.User).FirstOrDefaultAsync(c => c.Id == customerId);
        if (customer == null)
            return NotFound(new { message = "Cliente solicitante não encontrado." });

        // Ninguém avalia em nome de outro cliente.
        if (User.GetUserId() != customer.UserId && !User.IsAdmin())
            return Forbid();

        // E só pode avaliar um chamado que é dele.
        if (request.ServiceId.HasValue && request.ServiceId.Value != Guid.Empty
            && !await db.Services.AnyAsync(s => s.Id == request.ServiceId.Value && s.CustomerId == customerId))
            return Forbid();

        Guid targetReviewedUserId = Guid.Empty;
        Guid? targetAppointmentId = request.AppointmentId;

        if (request.ReviewedUserId.HasValue && request.ReviewedUserId.Value != Guid.Empty)
        {
            targetReviewedUserId = request.ReviewedUserId.Value;
            // Se o ID passado for o Id da entidade Provider e não da entidade User, mapeia para UserId
            var prov = await db.Providers.FirstOrDefaultAsync(p => p.Id == targetReviewedUserId);
            if (prov != null)
            {
                targetReviewedUserId = prov.UserId;
            }
        }
        else if (request.AppointmentId.HasValue && request.AppointmentId.Value != Guid.Empty)
        {
            var appointment = await db.Appointments
                .Include(a => a.Provider)
                .FirstOrDefaultAsync(a => a.Id == request.AppointmentId.Value);

            if (appointment?.Provider != null)
            {
                targetReviewedUserId = appointment.Provider.UserId;
            }
        }

        // Se ainda não identificou pelo ReviewedUserId ou AppointmentId, tenta localizar via ServiceId
        if (targetReviewedUserId == Guid.Empty && request.ServiceId.HasValue && request.ServiceId.Value != Guid.Empty)
        {
            var srv = await db.Services
                .Include(s => s.Appointment)
                    .ThenInclude(a => a.Provider)
                .Include(s => s.Proposals)
                    .ThenInclude(p => p.Provider)
                .FirstOrDefaultAsync(s => s.Id == request.ServiceId.Value);

            if (srv != null)
            {
                var acceptedProposal = srv.Proposals.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.Accepted);
                var matchedProvider = srv.Appointment?.Provider ?? acceptedProposal?.Provider;
                if (matchedProvider != null)
                {
                    targetReviewedUserId = matchedProvider.UserId;
                    if (!targetAppointmentId.HasValue && srv.Appointment != null)
                    {
                        targetAppointmentId = srv.Appointment.Id;
                    }
                }
            }
        }

        if (targetReviewedUserId == Guid.Empty)
        {
            return BadRequest(new { message = "Não foi possível identificar o profissional avaliado. Verifique se o serviço possui um profissional aceito." });
        }

        // Verifica se já existe uma avaliação registrada para este chamado/agendamento por este cliente
        Review? existingReview = null;
        if (request.ServiceId.HasValue && request.ServiceId.Value != Guid.Empty)
        {
            existingReview = await db.Reviews.FirstOrDefaultAsync(r =>
                (r.ServiceId == request.ServiceId.Value || (targetAppointmentId.HasValue && r.AppointmentId == targetAppointmentId.Value))
                && r.ReviewerUserId == customer.UserId);
        }
        else if (targetAppointmentId.HasValue && targetAppointmentId.Value != Guid.Empty)
        {
            existingReview = await db.Reviews.FirstOrDefaultAsync(r =>
                r.AppointmentId == targetAppointmentId.Value && r.ReviewerUserId == customer.UserId);
        }

        Review review;
        bool isUpdate = existingReview != null;

        if (existingReview != null)
        {
            // Atualiza a avaliação existente do mesmo serviço (troca a antiga pela mais recente)
            existingReview.Rating = request.Rating;
            existingReview.Comment = request.Comment?.Trim();
            existingReview.UpdatedAt = DateTime.UtcNow;
            if (!existingReview.ServiceId.HasValue && request.ServiceId.HasValue)
            {
                existingReview.ServiceId = request.ServiceId.Value;
            }
            if (!existingReview.AppointmentId.HasValue && targetAppointmentId.HasValue)
            {
                existingReview.AppointmentId = targetAppointmentId.Value;
            }
            review = existingReview;
        }
        else
        {
            // Cria a entidade Review persistida no banco
            review = new Review
            {
                Id = Guid.NewGuid(),
                ServiceId = request.ServiceId,
                AppointmentId = targetAppointmentId,
                ReviewerUserId = customer.UserId,
                ReviewedUserId = targetReviewedUserId,
                Rating = request.Rating,
                Comment = request.Comment?.Trim(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.Reviews.Add(review);
        }

        await db.SaveChangesAsync();

        // Atualiza a média de estrelas e quantidade de serviços concluídos do prestador com base no banco real
        var provider = await db.Providers.FirstOrDefaultAsync(p => p.UserId == targetReviewedUserId);
        if (provider != null)
        {
            var existingRatings = await db.Reviews
                .Where(r => r.ReviewedUserId == targetReviewedUserId)
                .Select(r => r.Rating)
                .ToListAsync();

            if (existingRatings.Any())
            {
                provider.AverageRating = Math.Round((decimal)existingRatings.Average(), 1);
                provider.CompletedServicesCount = Math.Max(provider.CompletedServicesCount, existingRatings.Count);
                provider.Touch();
                await db.SaveChangesAsync();
            }
            else
            {
                provider.AverageRating = 0.0m;
                provider.Touch();
                await db.SaveChangesAsync();
            }
        }

        return Ok(new
        {
            message = isUpdate ? "Avaliação atualizada com sucesso!" : "Avaliação registrada com sucesso!",
            rating = review.Rating,
            id = review.Id,
            isUpdate
        });
    }

    /// <summary>
    /// Retorna a avaliação de um serviço específico (se houver).
    /// GET /api/Reviews/by-service/{serviceId}
    /// </summary>
    [HttpGet("by-service/{serviceId:guid}")]
    [ProducesResponseType(typeof(ReviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetReviewByService(Guid serviceId)
    {
        var appt = await db.Appointments.FirstOrDefaultAsync(a => a.ServiceId == serviceId);
        Guid? appointmentId = appt?.Id;

        var review = await db.Reviews
            .Include(r => r.ReviewerUser)
            .FirstOrDefaultAsync(r => r.ServiceId == serviceId || (appointmentId.HasValue && r.AppointmentId == appointmentId.Value));

        if (review == null)
            return NotFound(new { message = "Nenhuma avaliação encontrada para este serviço." });

        return Ok(new ReviewDto(
            review.Id,
            review.ReviewerUser != null ? review.ReviewerUser.Name : "Cliente",
            review.ReviewerUser != null ? review.ReviewerUser.ProfilePicture : null,
            review.Rating,
            review.Comment,
            review.CreatedAt
        ));
    }

    /// <summary>
    /// Retorna as avaliações reais recebidas por um prestador específico diretamente do banco.
    /// GET /api/Reviews/by-user/{userId}
    /// </summary>
    [HttpGet("by-user/{userId:guid}")]
    [ProducesResponseType(typeof(IEnumerable<ReviewDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReviewsByUserId(Guid userId)
    {
        var reviews = await db.Reviews
            .Include(r => r.ReviewerUser)
            .Where(r => r.ReviewedUserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new ReviewDto(
                r.Id,
                r.ReviewerUser != null ? r.ReviewerUser.Name : "Cliente",
                r.ReviewerUser != null ? r.ReviewerUser.ProfilePicture : null,
                r.Rating,
                r.Comment,
                r.CreatedAt
            ))
            .ToListAsync();

        return Ok(reviews);
    }

    /// <summary>
    /// Retorna a avaliação de um agendamento específico (se houver).
    /// GET /api/Reviews/by-appointment/{appointmentId}
    /// </summary>
    [HttpGet("by-appointment/{appointmentId:guid}")]
    [ProducesResponseType(typeof(ReviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetReviewByAppointment(Guid appointmentId)
    {
        var review = await db.Reviews
            .Include(r => r.ReviewerUser)
            .FirstOrDefaultAsync(r => r.AppointmentId == appointmentId);

        if (review == null)
            return NotFound(new { message = "Nenhuma avaliação encontrada para este agendamento." });

        return Ok(new ReviewDto(
            review.Id,
            review.ReviewerUser != null ? review.ReviewerUser.Name : "Cliente",
            review.ReviewerUser != null ? review.ReviewerUser.ProfilePicture : null,
            review.Rating,
            review.Comment,
            review.CreatedAt
        ));
    }
}
