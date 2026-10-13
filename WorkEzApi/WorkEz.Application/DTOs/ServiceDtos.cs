using System.ComponentModel.DataAnnotations;
using WorkEz.Domain.Enums;

namespace WorkEz.Application.DTOs;

public record CreateServiceRequest(
    [Required] Guid CustomerId,
    [Required] Guid CategoryId,
    [Required][MaxLength(300)] string Title,
    string? Description,
    string? ImageUrl,
    DateTime? DesiredDate
);

public record UpdateServiceStatusRequest(
    [Required] ServiceStatus NewStatus,
    string? Observations
);

public record ProviderAcceptRequest(
    [Required] Guid ProviderUserId,
    [Required][Range(0.01, 100000.00)] decimal AgreedPrice,
    DateTime? ScheduledDate
);

public record ServiceResponseDto(
    Guid Id,
    Guid CustomerId,
    Guid CategoryId,
    string Title,
    string? Description,
    string? ImageUrl,
    DateTime? DesiredDate,
    string Status,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
