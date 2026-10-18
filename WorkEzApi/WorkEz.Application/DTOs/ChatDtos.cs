namespace WorkEz.Application.DTOs;

/// <summary>
/// DTO representing a chat message response, decoupled from specific proposals.
/// Supports both proposal-level negotiations and service-level conversations.
/// </summary>
public record ChatMessageResponseDto(
    Guid Id,
    Guid? ProposalId,
    Guid? ServiceId,
    Guid SenderId,
    string Content,
    bool IsFromProvider,
    DateTime SentAt
);

/// <summary>
/// Command to send a chat message with contextual routing.
/// </summary>
public record SendChatMessageCommand(
    Guid SenderId,
    string Content,
    bool IsFromProvider,
    Guid? ProposalId = null,
    Guid? ServiceId = null
);

/// <summary>
/// Summary representation of a chat conversation thread.
/// </summary>
public record ChatConversationSummaryDto(
    Guid? ProposalId,
    Guid? ServiceId,
    string ContextTitle,
    string OtherParticipantName,
    int TotalMessages,
    DateTime? LastMessageAt,
    string? LastMessageSnippet
);
