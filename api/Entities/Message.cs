using WorkEz.Api.Enums;

namespace WorkEz.Api.Entities;

/// <summary>
/// Represents a single message within a <see cref="Conversation"/>.
/// </summary>
public class Message
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid ConversationId { get; set; }

    /// <summary>The <see cref="User"/> who sent this message.</summary>
    public Guid SenderUserId { get; set; }

    /// <summary>Text body or URL to the attached file/image.</summary>
    public string Content { get; set; } = string.Empty;

    public MessageType MessageType { get; set; } = MessageType.Text;

    /// <summary>Whether the recipient has read this message.</summary>
    public bool IsRead { get; set; } = false;

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    // ── Navigation properties ──────────────────────────────────────────────────
    public Conversation Conversation { get; set; } = null!;
    public User SenderUser { get; set; } = null!;
}
