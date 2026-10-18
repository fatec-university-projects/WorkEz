namespace WorkEz.Application.DTOs;

public record CustomerProfileDto(
    Guid Id,
    Guid UserId,
    string Name,
    string Email,
    string? Phone,
    string? Photo,
    string? Notes
);
