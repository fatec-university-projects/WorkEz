namespace WorkEz.Application.DTOs;

/// <summary>
/// DTO Response com detalhes da proposta e métricas financeiras.
/// </summary>
public record ProposalResponseDto(
    Guid Id,
    Guid ServiceId,
    Guid ProviderId,
    string ProviderName,
    decimal ProposedPrice,
    decimal EstimatedPlatformFee,
    decimal NetProviderEarnings,
    string? Description,
    string? EstimatedTime,
    string Status,
    DateTime CreatedAt,
    decimal? CounterPrice,
    string? CounterDescription,
    DateTime? CounterOfferedAt = null,
    decimal? LaborPrice = null,
    decimal? MaterialsPrice = null,
    string? ProviderPhoto = null,
    decimal? ProviderRating = null,
    Guid? ProviderUserId = null,
    string? ServiceStatus = null
);

public record ChatMessageDto(
    Guid Id,
    Guid? ProposalId,
    Guid SenderId,
    string Content,
    bool IsFromProvider,
    DateTime SentAt,
    Guid? ServiceId = null
);

public record CounterProposalRequest(
    Guid CustomerUserId,
    Guid ProposalId,
    decimal CounterPrice,
    string? CounterDescription
);

public record AcceptCounterRequest(
    Guid ProviderUserId,
    Guid ProposalId
);

public record RejectCounterRequest(
    Guid ProviderUserId,
    Guid ProposalId
);

public record ProviderActionRequest(
    Guid ProviderUserId
);

public record SendChatMessageRequest(
    Guid ProposalId,
    Guid SenderId,
    string Content,
    bool IsFromProvider
);
