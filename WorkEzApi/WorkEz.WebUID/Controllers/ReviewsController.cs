using Microsoft.AspNetCore.Mvc;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.WebUID.Auth;

namespace WorkEz.WebUID.Controllers;

/// <summary>
/// Controlador para registro e consulta de avaliações reais pós-atendimento.
/// Consumido por WorkEzApp/app/client/rating/[id].tsx e provider/ratings.tsx.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ReviewsController(IReviewApplicationService reviewService) : ControllerBase
{
    private readonly IReviewApplicationService _reviewService = reviewService;

    /// <summary>
    /// Registra avaliação real de um serviço/prestador pelo cliente.
    /// POST /api/Reviews/by-customer/{customerId}
    /// </summary>
    [HttpPost("by-customer/{customerId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateReview(Guid customerId, [FromBody] CreateReviewRequest request)
    {
        var callerUserId = User.GetUserId();
        if (callerUserId is null)
            return Forbid();

        var result = await _reviewService.CreateReviewAsync(customerId, request, callerUserId.Value, User.IsAdmin());
        if (!result.IsSuccess)
        {
            return result.ErrorCode switch
            {
                "FORBIDDEN" => Forbid(),
                "NOT_FOUND" => NotFound(new { message = result.Error }),
                _ => BadRequest(new { message = result.Error })
            };
        }

        return Ok(new
        {
            message = result.Value!.Message,
            rating = result.Value.Rating,
            id = result.Value.Id,
            isUpdate = result.Value.IsUpdate
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
        var result = await _reviewService.GetReviewByServiceAsync(serviceId);
        if (!result.IsSuccess)
            return NotFound(new { message = result.Error });

        return Ok(result.Value);
    }

    /// <summary>
    /// Retorna as avaliações reais recebidas por um prestador específico diretamente do banco.
    /// GET /api/Reviews/by-user/{userId}
    /// </summary>
    [HttpGet("by-user/{userId:guid}")]
    [ProducesResponseType(typeof(IEnumerable<ReviewDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReviewsByUserId(Guid userId)
    {
        var reviews = await _reviewService.GetReviewsByUserIdAsync(userId);
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
        var result = await _reviewService.GetReviewByAppointmentAsync(appointmentId);
        if (!result.IsSuccess)
            return NotFound(new { message = result.Error });

        return Ok(result.Value);
    }
}
