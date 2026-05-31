using WorkEz.Api.Enums;

namespace WorkEz.Api.Entities;

/// <summary>
/// Stores data specific to an administrator.
/// </summary>
public class Administrator
{
    public Guid Id { get; init; } = Guid.NewGuid();

    /// <summary>Foreign key to <see cref="User"/>.</summary>
    public Guid UserId { get; set; }

    public AccessLevel AccessLevel { get; set; } = AccessLevel.Moderator;

    /// <summary>Human-readable role label (e.g. "Customer Support", "Financial Admin").</summary>
    public string? Role { get; set; }

    // ── Navigation properties ──────────────────────────────────────────────────
    public User User { get; set; } = null!;
}
