using WorkEz.Api.Enums;

namespace WorkEz.Api.Entities;

/// <summary>
/// Represents a complaint or incident report filed by one user against another
/// in the context of an <see cref="Appointment"/>.
/// </summary>
public class Report
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid AppointmentId { get; set; }

    /// <summary>The <see cref="User"/> who filed the report.</summary>
    public Guid ReporterUserId { get; set; }

    /// <summary>The <see cref="User"/> being reported.</summary>
    public Guid ReportedUserId { get; set; }

    /// <summary>Short classification of the problem (e.g. "No-show", "Fraud", "Harassment").</summary>
    public string Reason { get; set; } = string.Empty;

    public string? Description { get; set; }

    public ReportStatus ReportStatus { get; set; } = ReportStatus.Open;

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    /// <summary>UTC timestamp when an administrator resolved or dismissed the report.</summary>
    public DateTime? ResolvedAt { get; set; }

    // ── Navigation properties ──────────────────────────────────────────────────
    public Appointment Appointment { get; set; } = null!;
    public User ReporterUser { get; set; } = null!;
    public User ReportedUser { get; set; } = null!;
}
