using WorkEz.Application.DTOs;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Interfaces;

namespace WorkEz.Application.Services;

public interface IReviewApplicationService
{
    Task<Result<ReviewCreatedResultDto>> CreateReviewAsync(Guid customerId, CreateReviewRequest request, Guid callerUserId, bool isAdmin);
    Task<Result<ReviewDto>> GetReviewByServiceAsync(Guid serviceId);
    Task<IEnumerable<ReviewDto>> GetReviewsByUserIdAsync(Guid userId);
    Task<Result<ReviewDto>> GetReviewByAppointmentAsync(Guid appointmentId);
}

public class ReviewApplicationService(
    IReviewRepository reviewRepository,
    ICustomerRepository customerRepository,
    IServiceRepository serviceRepository,
    IServiceProviderRepository providerRepository,
    IAppointmentRepository appointmentRepository
) : IReviewApplicationService
{
    private readonly IReviewRepository _reviewRepository = reviewRepository;
    private readonly ICustomerRepository _customerRepository = customerRepository;
    private readonly IServiceRepository _serviceRepository = serviceRepository;
    private readonly IServiceProviderRepository _providerRepository = providerRepository;
    private readonly IAppointmentRepository _appointmentRepository = appointmentRepository;

    public async Task<Result<ReviewCreatedResultDto>> CreateReviewAsync(
        Guid customerId,
        CreateReviewRequest request,
        Guid callerUserId,
        bool isAdmin)
    {
        var ratingCheck = ValidateReviewRating(request.Rating);
        if (!ratingCheck.IsSuccess)
            return Result<ReviewCreatedResultDto>.Failure(ratingCheck.Error!, ratingCheck.ErrorCode!);

        var customerAuth = await AuthorizeCustomerReviewAsync(customerId, callerUserId, isAdmin, request.ServiceId);
        if (!customerAuth.IsSuccess)
            return Result<ReviewCreatedResultDto>.Failure(customerAuth.Error!, customerAuth.ErrorCode!);

        var targetResolution = await ResolveReviewedTargetAsync(request);
        if (!targetResolution.IsSuccess)
            return Result<ReviewCreatedResultDto>.Failure(targetResolution.Error!, targetResolution.ErrorCode!);

        var (targetReviewedUserId, targetAppointmentId) = targetResolution.Value;
        var (review, isUpdate) = await UpsertReviewAsync(customerAuth.Value!.UserId, targetReviewedUserId, targetAppointmentId, request);

        await RecalculateProviderRatingAsync(targetReviewedUserId);

        return Result<ReviewCreatedResultDto>.Success(new ReviewCreatedResultDto(
            isUpdate ? "Avaliação atualizada com sucesso!" : "Avaliação registrada com sucesso!",
            review.Rating,
            review.Id,
            isUpdate
        ));
    }

    public async Task<Result<ReviewDto>> GetReviewByServiceAsync(Guid serviceId)
    {
        var review = await _reviewRepository.GetReviewByServiceAsync(serviceId);
        if (review == null)
            return Result<ReviewDto>.Failure("Nenhuma avaliação encontrada para este serviço.", "NOT_FOUND");

        return Result<ReviewDto>.Success(new ReviewDto(
            review.Id,
            review.ReviewerUser?.Name ?? "Cliente",
            review.ReviewerUser?.ProfilePicture,
            review.Rating,
            review.Comment,
            review.CreatedAt
        ));
    }

    public async Task<IEnumerable<ReviewDto>> GetReviewsByUserIdAsync(Guid userId)
    {
        var reviews = await _reviewRepository.GetReviewsByReviewedUserIdAsync(userId);
        return reviews.Select(r => new ReviewDto(
            r.Id,
            r.ReviewerUser?.Name ?? "Cliente",
            r.ReviewerUser?.ProfilePicture,
            r.Rating,
            r.Comment,
            r.CreatedAt
        ));
    }

    public async Task<Result<ReviewDto>> GetReviewByAppointmentAsync(Guid appointmentId)
    {
        var review = await _reviewRepository.GetReviewByAppointmentAsync(appointmentId);
        if (review == null)
            return Result<ReviewDto>.Failure("Nenhuma avaliação encontrada para este agendamento.", "NOT_FOUND");

        return Result<ReviewDto>.Success(new ReviewDto(
            review.Id,
            review.ReviewerUser?.Name ?? "Cliente",
            review.ReviewerUser?.ProfilePicture,
            review.Rating,
            review.Comment,
            review.CreatedAt
        ));
    }

    // ─── Private Decomposition Methods ─────────────────────────────────────────

    private static Result<bool> ValidateReviewRating(int rating)
    {
        if (rating < 1 || rating > 5)
            return Result<bool>.Failure("A nota deve ser entre 1 e 5 estrelas.", "BAD_REQUEST");

        return Result<bool>.Success(true);
    }

    private async Task<Result<Customer>> AuthorizeCustomerReviewAsync(
        Guid customerId,
        Guid callerUserId,
        bool isAdmin,
        Guid? serviceId)
    {
        var customer = await _customerRepository.GetByIdWithUserAsync(customerId);
        if (customer == null)
            return Result<Customer>.Failure("Cliente solicitante não encontrado.", "NOT_FOUND");

        if (callerUserId != customer.UserId && !isAdmin)
            return Result<Customer>.Failure("Você não possui permissão para avaliar em nome deste cliente.", "FORBIDDEN");

        if (serviceId.HasValue && serviceId.Value != Guid.Empty)
        {
            var srv = await _serviceRepository.GetByIdAsync(serviceId.Value);
            if (srv == null || srv.CustomerId != customerId)
                return Result<Customer>.Failure("Chamado não encontrado para este cliente.", "FORBIDDEN");
        }

        return Result<Customer>.Success(customer);
    }

    private async Task<Result<(Guid targetReviewedUserId, Guid? targetAppointmentId)>> ResolveReviewedTargetAsync(CreateReviewRequest request)
    {
        Guid targetReviewedUserId = Guid.Empty;
        Guid? targetAppointmentId = request.AppointmentId;

        if (request.ReviewedUserId.HasValue && request.ReviewedUserId.Value != Guid.Empty)
        {
            targetReviewedUserId = request.ReviewedUserId.Value;
            var prov = await _providerRepository.GetByIdAsync(targetReviewedUserId);
            if (prov != null) targetReviewedUserId = prov.UserId;
        }
        else if (request.AppointmentId.HasValue && request.AppointmentId.Value != Guid.Empty)
        {
            var appointment = await _appointmentRepository.GetByIdAsync(request.AppointmentId.Value);
            if (appointment != null)
            {
                var prov = await _providerRepository.GetByIdAsync(appointment.ProviderId);
                if (prov != null) targetReviewedUserId = prov.UserId;
            }
        }

        if (targetReviewedUserId == Guid.Empty && request.ServiceId.HasValue && request.ServiceId.Value != Guid.Empty)
        {
            var srv = await _serviceRepository.GetByIdWithDetailsAsync(request.ServiceId.Value);
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
            return Result<(Guid, Guid?)>.Failure("Não foi possível identificar o profissional avaliado. Verifique se o serviço possui um profissional aceito.", "BAD_REQUEST");
        }

        return Result<(Guid, Guid?)>.Success((targetReviewedUserId, targetAppointmentId));
    }

    private async Task<(Review review, bool isUpdate)> UpsertReviewAsync(
        Guid reviewerUserId,
        Guid targetReviewedUserId,
        Guid? targetAppointmentId,
        CreateReviewRequest request)
    {
        Review? existingReview = null;
        if (request.ServiceId.HasValue && request.ServiceId.Value != Guid.Empty)
        {
            existingReview = await _reviewRepository.GetByServiceOrAppointmentAsync(request.ServiceId.Value, targetAppointmentId, reviewerUserId);
        }
        else if (targetAppointmentId.HasValue && targetAppointmentId.Value != Guid.Empty)
        {
            existingReview = await _reviewRepository.GetByAppointmentAndReviewerAsync(targetAppointmentId.Value, reviewerUserId);
        }

        bool isUpdate = existingReview != null;
        Review review;

        if (existingReview != null)
        {
            existingReview.Rating = request.Rating;
            existingReview.Comment = request.Comment?.Trim();
            existingReview.Touch();
            if (!existingReview.ServiceId.HasValue && request.ServiceId.HasValue)
                existingReview.ServiceId = request.ServiceId.Value;
            if (!existingReview.AppointmentId.HasValue && targetAppointmentId.HasValue)
                existingReview.AppointmentId = targetAppointmentId.Value;

            review = existingReview;
            _reviewRepository.Update(review);
        }
        else
        {
            review = new Review
            {
                Id = Guid.NewGuid(),
                ServiceId = request.ServiceId,
                AppointmentId = targetAppointmentId,
                ReviewerUserId = reviewerUserId,
                ReviewedUserId = targetReviewedUserId,
                Rating = request.Rating,
                Comment = request.Comment?.Trim(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _reviewRepository.AddAsync(review);
        }

        await _reviewRepository.SaveChangesAsync();
        return (review, isUpdate);
    }

    private async Task RecalculateProviderRatingAsync(Guid targetReviewedUserId)
    {
        var provider = await _providerRepository.GetByUserIdAsync(targetReviewedUserId);
        if (provider == null) return;

        var existingRatings = await _reviewRepository.GetRatingsForUserAsync(targetReviewedUserId);
        if (existingRatings.Any())
        {
            provider.AverageRating = Math.Round((decimal)existingRatings.Average(), 1);
            provider.CompletedServicesCount = Math.Max(provider.CompletedServicesCount, existingRatings.Count);
        }
        else
        {
            provider.AverageRating = 0.0m;
        }

        provider.Touch();
        _providerRepository.Update(provider);
        await _providerRepository.SaveChangesAsync();
    }
}
