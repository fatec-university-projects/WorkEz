namespace WorkEz.Api.Entities;

/// <summary>
/// Represents a review left after a completed <see cref="Appointment"/>.
/// Both parties may leave reviews; the <see cref="ReviewerUserId"/> identifies who wrote it.
/// </summary>
public class Review
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid AppointmentId { get; set; }

    /// <summary>The <see cref="User"/> who wrote this review.</summary>
    public Guid ReviewerUserId { get; set; }

    /// <summary>The <see cref="User"/> being reviewed.</summary>
    public Guid ReviewedUserId { get; set; }

    /// <summary>Rating from 1 (worst) to 5 (best).</summary>
    public byte Rating { get; set; }

    public string? Comment { get; set; }

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    // ── Navigation properties ──────────────────────────────────────────────────
    public Appointment Appointment { get; set; } = null!;
    public User ReviewerUser { get; set; } = null!;
    public User ReviewedUser { get; set; } = null!;
}
