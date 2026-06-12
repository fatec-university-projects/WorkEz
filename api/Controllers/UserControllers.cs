using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;
using WorkEz.Api.Services;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace WorkEz.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController(IUserService userService, AppDbContext context) : ControllerBase
{
    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId)) return Unauthorized();

        var user = await userService.GetByIdAsync(userId);
        
        return user is not null ? Ok(user) : NotFound();
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllUsers()
    {
        var list = await userService.GetAllAsync();
        return Ok(list);
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateUserStatus(Guid id, bool status)
    {
        var user = await context.Users.FindAsync(id);
        if (user is null) return NotFound();
        user.AccountStatus = status ? Enums.AccountStatus.Active : Enums.AccountStatus.Inactive;
        await context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                       ?? User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId)) return Unauthorized();

        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return NotFound();

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        if (normalizedEmail != user.Email && await context.Users.AnyAsync(u => u.Email == normalizedEmail))
        {
            return Conflict(new { message = "Este e-mail já está em uso por outro usuário." });
        }

        user.Name = dto.Name;
        user.Email = normalizedEmail;
        user.Phone = dto.Phone;
        if (!string.IsNullOrEmpty(dto.ProfilePicture))
        {
            user.ProfilePicture = dto.ProfilePicture;
        }
        user.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();

        return Ok(new
        {
            id = user.Id,
            name = user.Name,
            email = user.Email,
            phone = user.Phone,
            profilePicture = user.ProfilePicture,
            role = user.Role.ToString()
        });
    }
}

public class UpdateProfileDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? ProfilePicture { get; set; }
}
