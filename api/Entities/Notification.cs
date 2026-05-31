using WorkEz.Api.Enums;

namespace WorkEz.Api.Entities;

/// <summary>
/// Represents a system notification delivered to a specific <see cref="User"/>.
/// </summary>
public class Notification
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public NotificationType NotificationType { get; set; } = NotificationType.NewService;

    public bool IsRead { get; set; } = false;

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    // ── Navigation properties ──────────────────────────────────────────────────
    public User User { get; set; } = null!;
}
