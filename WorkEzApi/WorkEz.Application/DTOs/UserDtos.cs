using System.ComponentModel.DataAnnotations;
using WorkEz.Domain.Enums;

namespace WorkEz.Application.DTOs;

public record RegisterUserRequest(
    [Required][MaxLength(200)] string Name,
    [Required][EmailAddress][MaxLength(320)] string Email,
    [Required] UserRole Role,
    string? Phone,
    string? DocumentNumber
);

public record UserResponseDto(
    Guid Id,
    string Name,
    string Email,
    string? Phone,
    string? DocumentNumber,
    string Role,
    DateTime CreatedAt
);
