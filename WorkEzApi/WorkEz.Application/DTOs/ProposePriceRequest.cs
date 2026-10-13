using System.ComponentModel.DataAnnotations;

namespace WorkEz.Application.DTOs;

public record ProposePriceRequest(
    [Required] Guid ProviderUserId,
    [Required] Guid ServiceId,
    [Required][Range(0.01, 100000.00)] decimal ProposedPrice,
    string? Description,
    string? EstimatedTime
);
