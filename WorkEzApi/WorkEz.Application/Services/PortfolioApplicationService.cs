using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Interfaces;

namespace WorkEz.Application.Services;

// ─── DTOs ────────────────────────────────────────────────────────────────────

public record PortfolioDto(List<string> Images);

public record AddPortfolioImageRequest(Guid ProviderUserId, string ImageUrl);

public record RemovePortfolioImageRequest(Guid ProviderUserId, string ImageUrl);

public record ServiceProviderProfileDto(
    Guid Id,
    Guid UserId,
    string Name,
    string? Email,
    string? Phone,
    string? Photo,
    string? ProfessionalDescription,
    decimal AverageRating,
    int CompletedServicesCount,
    bool DocumentVerified,
    List<string> Portfolio,
    List<CategoryDto> Specialties,
    ReviewStatsDto ReviewStats
);

public record CategoryDto(Guid Id, string Name);

public record ReviewStatsDto(decimal Average, int Total, int PositivePercentage);

public record ProviderWeeklySummaryDto(
    int CompletedServices,
    double AcceptanceRate,
    decimal AverageRating,
    double GrowthRate,
    string PerformanceTitle,
    string PerformanceSubtitle,
    string TrendType = "neutral"
);

// ─── Interface ────────────────────────────────────────────────────────────────

public interface IPortfolioApplicationService
{
    Task<Result<PortfolioDto>> GetPortfolioByProviderIdAsync(Guid providerId);
    Task<Result<PortfolioDto>> GetPortfolioByUserIdAsync(Guid userId);
    Task<Result<PortfolioDto>> AddImageAsync(AddPortfolioImageRequest request);
    Task<Result<PortfolioDto>> RemoveImageAsync(RemovePortfolioImageRequest request);
    Task<Result<ServiceProviderProfileDto>> GetProviderByUserIdAsync(Guid userId);
    Task<Result<ServiceProviderProfileDto>> GetProviderByIdAsync(Guid providerId);
    Task<Result<ServiceProviderProfileDto>> UpdateProviderAsync(Guid providerId, string? professionalDescription);
    Task<Result<ProviderWeeklySummaryDto>> GetWeeklySummaryByUserIdAsync(Guid userId, DateTime? referenceDate = null);
    Task<Result<ProviderWeeklySummaryDto>> GetWeeklySummaryByProviderIdAsync(Guid providerId, DateTime? referenceDate = null);
}

// ─── Implementation ───────────────────────────────────────────────────────────

/// <summary>
/// Application Service responsible for orchestrating portfolio and provider-profile use cases.
/// Follows Clean Architecture: delegates to repositories, maps to DTOs.
/// </summary>
public class PortfolioApplicationService(IServiceProviderRepository providerRepository) : IPortfolioApplicationService
{
    private readonly IServiceProviderRepository _providerRepository = providerRepository;

    public async Task<Result<PortfolioDto>> GetPortfolioByProviderIdAsync(Guid providerId)
    {
        var images = await _providerRepository.GetPortfolioAsync(providerId);
        return Result<PortfolioDto>.Success(new PortfolioDto(images));
    }

    public async Task<Result<PortfolioDto>> GetPortfolioByUserIdAsync(Guid userId)
    {
        var provider = await _providerRepository.GetByUserIdAsync(userId);
        if (provider is null)
            return Result<PortfolioDto>.Failure("Prestador não encontrado.", "PROVIDER_NOT_FOUND");

        var images = await _providerRepository.GetPortfolioAsync(provider.Id);
        return Result<PortfolioDto>.Success(new PortfolioDto(images));
    }

    public async Task<Result<PortfolioDto>> AddImageAsync(AddPortfolioImageRequest request)
    {
        var provider = await _providerRepository.GetByUserIdAsync(request.ProviderUserId);
        if (provider is null)
            return Result<PortfolioDto>.Failure("Prestador não encontrado.", "PROVIDER_NOT_FOUND");

        if (string.IsNullOrWhiteSpace(request.ImageUrl))
            return Result<PortfolioDto>.Failure("URL da imagem é obrigatória.", "INVALID_IMAGE_URL");

        var success = await _providerRepository.AddPortfolioImageAsync(provider.Id, request.ImageUrl);
        if (!success)
            return Result<PortfolioDto>.Failure("Não foi possível adicionar a imagem ao portfólio.", "ADD_FAILED");

        var images = await _providerRepository.GetPortfolioAsync(provider.Id);
        return Result<PortfolioDto>.Success(new PortfolioDto(images));
    }

    public async Task<Result<PortfolioDto>> RemoveImageAsync(RemovePortfolioImageRequest request)
    {
        var provider = await _providerRepository.GetByUserIdAsync(request.ProviderUserId);
        if (provider is null)
            return Result<PortfolioDto>.Failure("Prestador não encontrado.", "PROVIDER_NOT_FOUND");

        if (string.IsNullOrWhiteSpace(request.ImageUrl))
            return Result<PortfolioDto>.Failure("URL da imagem é obrigatória.", "INVALID_IMAGE_URL");

        var success = await _providerRepository.RemovePortfolioImageAsync(provider.Id, request.ImageUrl);
        if (!success)
            return Result<PortfolioDto>.Failure("Imagem não encontrada no portfólio.", "IMAGE_NOT_FOUND");

        var images = await _providerRepository.GetPortfolioAsync(provider.Id);
        return Result<PortfolioDto>.Success(new PortfolioDto(images));
    }

    public async Task<Result<ServiceProviderProfileDto>> GetProviderByUserIdAsync(Guid userId)
    {
        var provider = await _providerRepository.GetByUserIdAsync(userId);
        if (provider is null)
            return Result<ServiceProviderProfileDto>.Failure("Prestador não encontrado.", "PROVIDER_NOT_FOUND");

        return Result<ServiceProviderProfileDto>.Success(MapToProfileDto(provider));
    }

    public async Task<Result<ServiceProviderProfileDto>> GetProviderByIdAsync(Guid providerId)
    {
        var provider = await _providerRepository.GetByIdWithUserAsync(providerId);
        if (provider is null)
            return Result<ServiceProviderProfileDto>.Failure("Prestador não encontrado.", "PROVIDER_NOT_FOUND");

        return Result<ServiceProviderProfileDto>.Success(MapToProfileDto(provider));
    }

    public async Task<Result<ServiceProviderProfileDto>> UpdateProviderAsync(Guid providerId, string? professionalDescription)
    {
        var provider = await _providerRepository.GetByIdWithUserAsync(providerId);
        if (provider is null)
            return Result<ServiceProviderProfileDto>.Failure("Prestador não encontrado.", "PROVIDER_NOT_FOUND");

        provider.ProfessionalDescription = professionalDescription;
        provider.Touch();
        _providerRepository.Update(provider);
        await _providerRepository.SaveChangesAsync();

        return Result<ServiceProviderProfileDto>.Success(MapToProfileDto(provider));
    }

    public async Task<Result<ProviderWeeklySummaryDto>> GetWeeklySummaryByUserIdAsync(Guid userId, DateTime? referenceDate = null)
    {
        var provider = await _providerRepository.GetWithDetailsByUserIdAsync(userId);
        if (provider is null)
            return Result<ProviderWeeklySummaryDto>.Failure("Prestador não encontrado.", "PROVIDER_NOT_FOUND");

        return Result<ProviderWeeklySummaryDto>.Success(CalculateWeeklySummary(provider, referenceDate));
    }

    public async Task<Result<ProviderWeeklySummaryDto>> GetWeeklySummaryByProviderIdAsync(Guid providerId, DateTime? referenceDate = null)
    {
        var provider = await _providerRepository.GetWithDetailsByIdAsync(providerId);
        if (provider is null)
            return Result<ProviderWeeklySummaryDto>.Failure("Prestador não encontrado.", "PROVIDER_NOT_FOUND");

        return Result<ProviderWeeklySummaryDto>.Success(CalculateWeeklySummary(provider, referenceDate));
    }

    public static ProviderWeeklySummaryDto CalculateWeeklySummary(ServiceProvider provider, DateTime? referenceDate = null)
    {
        var now = referenceDate ?? DateTime.UtcNow;
        var currentWeekStart = now.AddDays(-7);
        var previousWeekStart = now.AddDays(-14);

        var appointments = provider.Appointments ?? (ICollection<Appointment>)[];
        var proposals = provider.Proposals ?? (ICollection<Proposal>)[];

        // Serviços concluídos nesta semana (últimos 7 dias)
        var thisWeekCount = appointments.Count(a =>
            a.AppointmentStatus == Domain.Enums.AppointmentStatus.Completed &&
            (a.CompletedAt ?? a.CreatedAt) >= currentWeekStart &&
            (a.CompletedAt ?? a.CreatedAt) <= now);

        // Serviços concluídos na semana anterior (7 a 14 dias atrás)
        var lastWeekCount = appointments.Count(a =>
            a.AppointmentStatus == Domain.Enums.AppointmentStatus.Completed &&
            (a.CompletedAt ?? a.CreatedAt) >= previousWeekStart &&
            (a.CompletedAt ?? a.CreatedAt) < currentWeekStart);

        // Cálculo de taxa de crescimento e mensagens de desempenho
        double growthRate;
        string performanceTitle;
        string performanceSubtitle;
        string trendType;

        if (lastWeekCount == 0 && thisWeekCount == 0)
        {
            growthRate = 0.0;
            trendType = "neutral";
            performanceTitle = "Sem atividades recentes";
            performanceSubtitle = "Aceite novos chamados para começar a crescer";
        }
        else if (lastWeekCount == 0 && thisWeekCount > 0)
        {
            growthRate = 100.0;
            trendType = "positive";
            performanceTitle = "Ótimo desempenho!";
            performanceSubtitle = "Você cresceu 100% esta semana";
        }
        else
        {
            var rawGrowth = ((double)(thisWeekCount - lastWeekCount) / lastWeekCount) * 100.0;
            growthRate = Math.Round(rawGrowth, 1);

            if (growthRate > 0)
            {
                trendType = "positive";
                performanceTitle = "Ótimo desempenho!";
                performanceSubtitle = $"Você cresceu {growthRate:0.#}% esta semana";
            }
            else if (growthRate == 0)
            {
                trendType = "stable";
                performanceTitle = "Desempenho constante!";
                performanceSubtitle = "Você manteve o ritmo da semana passada";
            }
            else
            {
                trendType = "negative";
                performanceTitle = "Desempenho em queda";
                performanceSubtitle = $"Você caiu {Math.Abs(growthRate):0.#}% em relação à semana passada";
            }
        }

        // Taxa de aceitação
        var totalProposals = proposals.Count;
        var acceptedProposals = proposals.Count(p => p.ProposalStatus == Domain.Enums.ProposalStatus.Accepted);
        double acceptanceRate;

        if (totalProposals > 0)
        {
            acceptanceRate = Math.Min(100.0, Math.Round(((double)acceptedProposals / totalProposals) * 100.0, 1));
        }
        else if (appointments.Count > 0)
        {
            acceptanceRate = 100.0;
        }
        else
        {
            acceptanceRate = 0.0;
        }

        return new ProviderWeeklySummaryDto(
            CompletedServices: thisWeekCount,
            AcceptanceRate: acceptanceRate,
            AverageRating: Math.Round(provider.AverageRating, 1),
            GrowthRate: growthRate,
            PerformanceTitle: performanceTitle,
            PerformanceSubtitle: performanceSubtitle,
            TrendType: trendType
        );
    }

    // ─── Mapping ─────────────────────────────────────────────────────────────

    private static ServiceProviderProfileDto MapToProfileDto(ServiceProvider provider)
    {
        var user = provider.User;

        return new ServiceProviderProfileDto(
            Id: provider.Id,
            UserId: provider.UserId,
            Name: user?.Name ?? "Profissional",
            Email: user?.Email,
            Phone: user?.Phone,
            Photo: user?.ProfilePicture,
            ProfessionalDescription: provider.ProfessionalDescription,
            AverageRating: provider.AverageRating,
            CompletedServicesCount: provider.Appointments?.Count(a => a.AppointmentStatus == Domain.Enums.AppointmentStatus.Completed) ?? 0,
            DocumentVerified: user?.DocumentNumber != null,
            Portfolio: provider.Portfolio,
            Specialties: [],
            ReviewStats: new ReviewStatsDto(
                Average: provider.AverageRating,
                Total: 0,
                PositivePercentage: 100
            )
        );
    }
}
