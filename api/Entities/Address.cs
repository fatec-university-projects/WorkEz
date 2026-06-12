using WorkEz.Api.Enums;

namespace WorkEz.Api.Entities;

/// <summary>
/// Stores a user's address, which may also be used as a service location.
/// </summary>
public class Address
{
    public Guid Id { get; init; } = Guid.NewGuid();

    /// <summary>Owner of this address (<see cref="User"/>).</summary>
    public Guid UserId { get; set; }

    public string ZipCode { get; set; } = string.Empty;

    public string Street { get; set; } = string.Empty;

    public string Number { get; set; } = string.Empty;

    public string? Complement { get; set; }

    public string Neighborhood { get; set; } = string.Empty;

    public string City { get; set; } = string.Empty;

    /// <summary>Two-letter Brazilian state abbreviation (e.g. SP, RJ).</summary>
    public string State { get; set; } = string.Empty;

    /// <summary>Latitude obtained via geocoding for proximity searches.</summary>
    public double? Latitude { get; set; }

    /// <summary>Longitude obtained via geocoding for proximity searches.</summary>
    public double? Longitude { get; set; }

    public AddressType AddressType { get; set; } = AddressType.Home;

    // ── Navigation properties ──────────────────────────────────────────────────
    [Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidateNever]
    public User User { get; set; } = null!;
    public ICollection<Service> Services { get; set; } = [];
}
