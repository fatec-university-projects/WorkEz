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
    DateTime CreatedAt
);
