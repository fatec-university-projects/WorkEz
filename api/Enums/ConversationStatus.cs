namespace WorkEz.Api.Enums;

/// <summary>
/// Indicates the current state of a chat conversation.
/// </summary>
public enum ConversationStatus
{
    /// <summary>Conversation is ongoing.</summary>
    Active = 0,

    /// <summary>Conversation has been archived (service concluded).</summary>
    Archived = 1,

    /// <summary>Conversation was blocked by a participant or administrator.</summary>
    Blocked = 2
}
