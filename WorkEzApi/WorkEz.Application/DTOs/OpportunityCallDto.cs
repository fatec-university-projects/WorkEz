namespace WorkEz.Application.DTOs;

public record OpportunityCallDto(
    Guid Id,
    string Category,
    string Description,
    string Status,
    string Date,
    string ClientName,
    decimal? SuggestedPrice = null,
    double? DistanceKm = null,
    int? EstimatedDurationMinutes = null,
    double? Latitude = null,
    double? Longitude = null
);
