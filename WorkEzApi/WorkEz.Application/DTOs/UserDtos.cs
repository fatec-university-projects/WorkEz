namespace WorkEz.Application.DTOs;

public record UpdateUserProfileRequest(
    string Name,
    string Email,
    string? Phone,
    string? ProfilePicture
);

public record UserProfileDto(
    Guid Id,
    string Name,
    string Email,
    string? Phone,
    string? ProfilePicture,
    string Role
);
