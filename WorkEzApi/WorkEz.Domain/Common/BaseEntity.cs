namespace WorkEz.Domain.Common;

/// <summary>
/// Abstract Base Entity providing identity (Guid Id) and audit timestamps (CreatedAt, UpdatedAt).
/// </summary>
public abstract class BaseEntity
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public void Touch() => UpdatedAt = DateTime.UtcNow;
}
