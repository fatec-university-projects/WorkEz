using WorkEz.Application.DTOs;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Services;

namespace WorkEz.Application.Services;

public interface IUserApplicationService
{
    Task<Result<UserResponseDto>> RegisterUserAsync(RegisterUserRequest request);
    Task<UserResponseDto?> GetUserByEmailAsync(string email);
    Task<UserResponseDto?> GetUserByIdAsync(Guid id);
}

public class UserApplicationService(IUserDomainService userDomainService) : IUserApplicationService
{
    private readonly IUserDomainService _userDomainService = userDomainService;

    public async Task<Result<UserResponseDto>> RegisterUserAsync(RegisterUserRequest request)
    {
        var result = await _userDomainService.RegisterUserAsync(
            request.Name,
            request.Email,
            request.Role,
            request.Phone,
            request.DocumentNumber
        );

        if (result.IsFailure)
        {
            return Result<UserResponseDto>.Failure(result.Error, result.ErrorCode);
        }

        return Result<UserResponseDto>.Success(MapToDto(result.Value));
    }

    public async Task<UserResponseDto?> GetUserByEmailAsync(string email)
    {
        var user = await _userDomainService.GetByEmailAsync(email);
        return user is null ? null : MapToDto(user);
    }

    public async Task<UserResponseDto?> GetUserByIdAsync(Guid id)
    {
        var user = await _userDomainService.GetByIdAsync(id);
        return user is null ? null : MapToDto(user);
    }

    private static UserResponseDto MapToDto(User user) => new(
        Id: user.Id,
        Name: user.Name,
        Email: user.Email,
        Phone: user.Phone,
        DocumentNumber: user.DocumentNumber,
        Role: user.Role.ToString(),
        CreatedAt: user.CreatedAt
    );
}
