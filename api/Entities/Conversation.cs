using WorkEz.Api.Enums;

namespace WorkEz.Api.Entities;

/// <summary>
/// Represents the chat channel opened between a <see cref="Customer"/> and a <see cref="ServiceProvider"/>
/// in the context of a specific <see cref="Service"/> request.
/// </summary>
public class Conversation
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid ServiceId { get; set; }

    public Guid CustomerId { get; set; }

    public Guid ProviderId { get; set; }

    public ConversationStatus Status { get; set; } = ConversationStatus.Active;

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // ── Navigation properties ──────────────────────────────────────────────────
    public Service Service { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
    public ServiceProvider Provider { get; set; } = null!;
    public ICollection<Message> Messages { get; set; } = [];
}
