namespace WorkEz.Application.DTOs;

public record UpdateProviderLocationRequest(
    double Latitude,
    double Longitude,
    double ServiceRadiusKm
);

public record NearbyProviderDto(
    Guid ProviderId,
    Guid UserId,
    string Name,
    string? Photo,
    string? ProfessionalDescription,
    decimal AverageRating,
    int CompletedServicesCount,
    double DistanceKm,
    int EstimatedTravelMinutes,
    double? Latitude,
    double? Longitude,
    double ServiceRadiusKm,
    List<string> Specialties
);
