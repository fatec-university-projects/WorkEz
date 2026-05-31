using WorkEz.Api.Enums;

namespace WorkEz.Api.Entities;

/// <summary>
/// Represents the geographic area within which a <see cref="ServiceProvider"/> is willing to work.
/// A provider may have multiple service areas.
/// </summary>
public class ServiceArea
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid ProviderId { get; set; }

    public string City { get; set; } = string.Empty;

    /// <summary>Two-letter state abbreviation (e.g. SP, RJ).</summary>
    public string State { get; set; } = string.Empty;

    public string? Neighborhood { get; set; }

    /// <summary>Latitude of the provider's base location for radius calculations.</summary>
    public double? BaseLatitude { get; set; }

    /// <summary>Longitude of the provider's base location for radius calculations.</summary>
    public double? BaseLongitude { get; set; }

    /// <summary>Maximum distance in kilometres the provider is willing to travel from their base.</summary>
    public double? RadiusKm { get; set; }

    public CategoryStatus Status { get; set; } = CategoryStatus.Active;

    // ── Navigation properties ──────────────────────────────────────────────────
    public ServiceProvider Provider { get; set; } = null!;
}
