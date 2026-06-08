using WorkEz.Api.Enums;

namespace WorkEz.Api.Entities;

/// <summary>
/// Represents a confirmed engagement between a <see cref="Customer"/> and a <see cref="ServiceProvider"/>,
/// created when the customer accepts a <see cref="Proposal"/>.
/// </summary>
public class Appointment
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid ServiceId { get; set; }

    public Guid ProposalId { get; set; }

    public Guid CustomerId { get; set; }

    public Guid ProviderId { get; set; }

    public AppointmentStatus AppointmentStatus { get; set; } = AppointmentStatus.Confirmed;

    /// <summary>Agreed price at confirmation time (may differ from proposal if negotiated).</summary>
    public decimal FinalPrice { get; set; }

    public DateTime ScheduledDate { get; set; }

    /// <summary>UTC timestamp when the service was marked as completed.</summary>
    public DateTime? CompletedAt { get; set; }

    /// <summary>Short alphanumeric code used to confirm the provider's arrival on-site.</summary>
    public string? ConfirmationCode { get; set; }

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // ── Navigation properties ──────────────────────────────────────────────────
    public Service Service { get; set; } = null!;
    public Proposal Proposal { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
    public ServiceProvider Provider { get; set; } = null!;
    public Payment? Payment { get; set; }
    public ICollection<Review> Reviews { get; set; } = [];
    public ICollection<Report> Reports { get; set; } = [];
}
