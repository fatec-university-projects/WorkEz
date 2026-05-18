using WorkEz.Api.DTOs;
using WorkEz.Api.Enums;

namespace WorkEz.Api.Services;

public interface IUserService
{
    Task<UserDto?> GetByIdAsync(Guid id);

    Task<UserDto?> GetByEmailAsync(string email);

    Task<IEnumerable<UserDto>> GetAllAsync();

    Task SetRoleAsync(Guid userId, UserRole role);
}
