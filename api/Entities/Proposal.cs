using WorkEz.Api.Enums;

namespace WorkEz.Api.Entities;

/// <summary>
/// Represents a proposal sent by a <see cref="ServiceProvider"/> in response to a <see cref="Service"/> request.
/// </summary>
public class Proposal
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid ServiceId { get; set; }

    public Guid ProviderId { get; set; }

    /// <summary>Price offered by the provider for executing the service.</summary>
    public decimal ProposedPrice { get; set; }

    /// <summary>Detailed explanation of what will be done and why.</summary>
    public string? Description { get; set; }

    /// <summary>Human-readable estimated time to complete (e.g. "2 hours", "1–2 days").</summary>
    public string? EstimatedTime { get; set; }

    public ProposalStatus ProposalStatus { get; set; } = ProposalStatus.Pending;

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // ── Navigation properties ──────────────────────────────────────────────────
    public Service Service { get; set; } = null!;
    public ServiceProvider Provider { get; set; } = null!;
    public Appointment? Appointment { get; set; }
}
