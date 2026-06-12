using WorkEz.Api.Enums;

namespace WorkEz.Api.Entities;

/// <summary>
/// Represents a service request created by a <see cref="Customer"/>.
/// The exact location is kept approximate until the customer explicitly releases it to the matched provider.
/// </summary>
public class Service
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid CustomerId { get; set; }

    public Guid CategoryId { get; set; }

    /// <summary>Address chosen by the customer for where the service will take place.</summary>
    public Guid AddressId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? ImageUrl { get; set; }

    public DateTime? DesiredDate { get; set; }

    public UrgencyLevel UrgencyLevel { get; set; } = UrgencyLevel.Low;

    public ServiceStatus ServiceStatus { get; set; } = ServiceStatus.Open;

    /// <summary>Approximate latitude shown to providers before the customer releases the exact location.</summary>
    public double? ApproximateLatitude { get; set; }

    /// <summary>Approximate longitude shown to providers before the customer releases the exact location.</summary>
    public double? ApproximateLongitude { get; set; }

    /// <summary>When true, the exact address coordinates are shared with the assigned provider.</summary>
    public bool LocationReleased { get; set; } = false;

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // ── Navigation properties ──────────────────────────────────────────────────
    [Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidateNever]
    public Customer Customer { get; set; } = null!;
    [Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidateNever]
    public Category Category { get; set; } = null!;
    [Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidateNever]
    public Address Address { get; set; } = null!;
    public ICollection<Proposal> Proposals { get; set; } = [];
    public Appointment? Appointment { get; set; }
    public Conversation? Conversation { get; set; }
}
