using WorkEz.Application.DTOs;
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
    List<ProviderCategoryDto> Specialties,
    ReviewStatsDto ReviewStats,
    double? Latitude = null,
    double? Longitude = null,
    double ServiceRadiusKm = 15.0
);

public record ProviderCategoryDto(Guid Id, string Name);

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
    Task<Result<ServiceProviderProfileDto>> UpdateLocationAsync(Guid providerId, double latitude, double longitude, double serviceRadiusKm);
    Task<Result<IEnumerable<NearbyProviderDto>>> GetNearbyProvidersAsync(double latitude, double longitude, double? radiusKm = null);
    Task<Result<ProviderWeeklySummaryDto>> GetWeeklySummaryByUserIdAsync(Guid userId, DateTime? referenceDate = null);
    Task<Result<ProviderWeeklySummaryDto>> GetWeeklySummaryByProviderIdAsync(Guid providerId, DateTime? referenceDate = null);
    Task<bool> OwnsProviderAsync(Guid providerId, Guid userId);
}

// ─── Implementation ───────────────────────────────────────────────────────────

/// <summary>
/// Application Service responsible for orchestrating portfolio and provider-profile use cases.
/// Follows Clean Architecture: delegates to repositories, maps to DTOs.
/// </summary>
public class PortfolioApplicationService(IServiceProviderRepository providerRepository) : IPortfolioApplicationService
{
    private readonly IServiceProviderRepository _providerRepository = providerRepository;

    public async Task<bool> OwnsProviderAsync(Guid providerId, Guid userId)
    {
        var provider = await _providerRepository.GetByIdAsync(providerId);
        return provider != null && provider.UserId == userId;
    }

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

        var specialties = await _providerRepository.GetSpecialtiesAsync(provider.Id);
        var specDtos = specialties.Select(s => new ProviderCategoryDto(s.Id, s.Name)).ToList();

        return Result<ServiceProviderProfileDto>.Success(MapToProfileDto(provider, specDtos));
    }

    public async Task<Result<ServiceProviderProfileDto>> GetProviderByIdAsync(Guid providerId)
    {
        var provider = await _providerRepository.GetByIdWithUserAsync(providerId);
        if (provider is null)
            return Result<ServiceProviderProfileDto>.Failure("Prestador não encontrado.", "PROVIDER_NOT_FOUND");

        var specialties = await _providerRepository.GetSpecialtiesAsync(provider.Id);
        var specDtos = specialties.Select(s => new ProviderCategoryDto(s.Id, s.Name)).ToList();

        return Result<ServiceProviderProfileDto>.Success(MapToProfileDto(provider, specDtos));
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

        var specialties = await _providerRepository.GetSpecialtiesAsync(provider.Id);
        var specDtos = specialties.Select(s => new ProviderCategoryDto(s.Id, s.Name)).ToList();

        return Result<ServiceProviderProfileDto>.Success(MapToProfileDto(provider, specDtos));
    }

    public async Task<Result<ServiceProviderProfileDto>> UpdateLocationAsync(Guid providerId, double latitude, double longitude, double serviceRadiusKm)
    {
        if (latitude < -90.0 || latitude > 90.0 || longitude < -180.0 || longitude > 180.0)
            return Result<ServiceProviderProfileDto>.Failure("Coordenadas geográficas inválidas.", "INVALID_COORDINATES");

        var provider = await _providerRepository.GetByIdWithUserAsync(providerId);
        if (provider is null)
            return Result<ServiceProviderProfileDto>.Failure("Prestador não encontrado.", "PROVIDER_NOT_FOUND");

        provider.Latitude = latitude;
        provider.Longitude = longitude;
        provider.ServiceRadiusKm = serviceRadiusKm >= 0 ? serviceRadiusKm : 0.0;
        provider.Touch();

        _providerRepository.Update(provider);
        await _providerRepository.SaveChangesAsync();

        var specialties = await _providerRepository.GetSpecialtiesAsync(provider.Id);
        var specDtos = specialties.Select(s => new ProviderCategoryDto(s.Id, s.Name)).ToList();

        return Result<ServiceProviderProfileDto>.Success(MapToProfileDto(provider, specDtos));
    }

    public async Task<Result<IEnumerable<NearbyProviderDto>>> GetNearbyProvidersAsync(double latitude, double longitude, double? radiusKm = null)
    {
        var allProviders = await _providerRepository.GetAllAsync();
        var providersWithCoords = allProviders
            .Where(p => p.Latitude.HasValue && p.Longitude.HasValue)
            .ToList();

        var nearbyList = new List<NearbyProviderDto>();

        foreach (var p in providersWithCoords)
        {
            if (p.Latitude is not { } pLat || p.Longitude is not { } pLon)
                continue;

            var dist = Domain.Common.GeoLocationUtils.CalculateDistanceKm(latitude, longitude, pLat, pLon);
            var isUnlimited = p.ServiceRadiusKm <= 0 || p.ServiceRadiusKm >= 9999;
            var effectiveRadius = isUnlimited ? double.MaxValue : (radiusKm.HasValue && radiusKm.Value > 0 ? radiusKm.Value : p.ServiceRadiusKm);

            if (dist <= effectiveRadius)
            {
                var providerWithUser = await _providerRepository.GetByIdWithUserAsync(p.Id);
                if (providerWithUser == null) continue;

                var specialties = await _providerRepository.GetSpecialtiesAsync(p.Id);
                var travelMin = Domain.Common.GeoLocationUtils.EstimateTravelMinutes(dist);

                nearbyList.Add(new NearbyProviderDto(
                    ProviderId: p.Id,
                    UserId: providerWithUser.UserId,
                    Name: providerWithUser.User?.Name ?? "Profissional",
                    Photo: providerWithUser.User?.ProfilePicture,
                    ProfessionalDescription: p.ProfessionalDescription,
                    AverageRating: p.AverageRating,
                    CompletedServicesCount: p.CompletedServicesCount,
                    DistanceKm: dist,
                    EstimatedTravelMinutes: travelMin,
                    Latitude: p.Latitude,
                    Longitude: p.Longitude,
                    ServiceRadiusKm: p.ServiceRadiusKm,
                    Specialties: specialties.Select(s => s.Name).ToList()
                ));
            }
        }

        var ordered = nearbyList.OrderBy(p => p.DistanceKm).ToList();
        return Result<IEnumerable<NearbyProviderDto>>.Success(ordered);
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
        var appointments = provider.Appointments ?? (ICollection<Appointment>)[];
        var proposals = provider.Proposals ?? (ICollection<Proposal>)[];

        var thisWeekCount = CountCompletedAppointments(appointments, now.AddDays(-7), now);
        var lastWeekCount = CountCompletedAppointments(appointments, now.AddDays(-14), now.AddDays(-7));

        var (growthRate, trendType, title, subtitle) = CalculateGrowthAndTrend(thisWeekCount, lastWeekCount);
        var acceptanceRate = CalculateAcceptanceRate(proposals, appointments);

        return new ProviderWeeklySummaryDto(
            CompletedServices: thisWeekCount,
            AcceptanceRate: acceptanceRate,
            AverageRating: Math.Round(provider.AverageRating, 1),
            GrowthRate: growthRate,
            PerformanceTitle: title,
            PerformanceSubtitle: subtitle,
            TrendType: trendType
        );
    }

    private static int CountCompletedAppointments(IEnumerable<Appointment> appointments, DateTime start, DateTime end) =>
        appointments.Count(a =>
            a.AppointmentStatus == Domain.Enums.AppointmentStatus.Completed &&
            (a.CompletedAt ?? a.CreatedAt) >= start &&
            (a.CompletedAt ?? a.CreatedAt) <= end);

    private static (double growthRate, string trendType, string title, string subtitle) CalculateGrowthAndTrend(int thisWeekCount, int lastWeekCount)
    {
        if (lastWeekCount == 0 && thisWeekCount == 0)
        {
            return (0.0, "neutral", "Sem atividades recentes", "Aceite novos chamados para começar a crescer");
        }

        if (lastWeekCount == 0 && thisWeekCount > 0)
        {
            return (100.0, "positive", "Ótimo desempenho!", "Você cresceu 100% esta semana");
        }

        var rawGrowth = ((double)(thisWeekCount - lastWeekCount) / lastWeekCount) * 100.0;
        var growthRate = Math.Round(rawGrowth, 1);

        if (growthRate > 0)
        {
            return (growthRate, "positive", "Ótimo desempenho!", $"Você cresceu {growthRate:0.#}% esta semana");
        }

        if (growthRate == 0)
        {
            return (0.0, "stable", "Desempenho constante!", "Você manteve o ritmo da semana passada");
        }

        return (growthRate, "negative", "Desempenho em queda", $"Você caiu {Math.Abs(growthRate):0.#}% em relação à semana passada");
    }

    private static double CalculateAcceptanceRate(ICollection<Proposal> proposals, ICollection<Appointment> appointments)
    {
        var totalProposals = proposals.Count;
        var acceptedProposals = proposals.Count(p => p.ProposalStatus == Domain.Enums.ProposalStatus.Accepted);

        if (totalProposals > 0)
            return Math.Min(100.0, Math.Round(((double)acceptedProposals / totalProposals) * 100.0, 1));

        return appointments.Count > 0 ? 100.0 : 0.0;
    }

    // ─── Mapping ─────────────────────────────────────────────────────────────

    private static ServiceProviderProfileDto MapToProfileDto(ServiceProvider provider, List<ProviderCategoryDto>? specialties = null)
    {
        var user = provider.User;

        var completedCount = (provider.Appointments != null && provider.Appointments.Count > 0)
            ? provider.Appointments.Count(a => a.AppointmentStatus == Domain.Enums.AppointmentStatus.Completed)
            : provider.CompletedServicesCount;

        return new ServiceProviderProfileDto(
            Id: provider.Id,
            UserId: provider.UserId,
            Name: user?.Name ?? "Profissional",
            Email: user?.Email,
            Phone: user?.Phone,
            Photo: user?.ProfilePicture,
            ProfessionalDescription: provider.ProfessionalDescription,
            AverageRating: provider.AverageRating,
            CompletedServicesCount: completedCount,
            DocumentVerified: user?.DocumentNumber != null,
            Portfolio: provider.Portfolio,
            Specialties: specialties ?? [],
            ReviewStats: new ReviewStatsDto(
                Average: provider.AverageRating,
                Total: completedCount,
                PositivePercentage: provider.AverageRating > 0 ? (int)Math.Round((provider.AverageRating / 5.0m) * 100) : 0
            ),
            Latitude: provider.Latitude,
            Longitude: provider.Longitude,
            ServiceRadiusKm: provider.ServiceRadiusKm
        );
    }
}
