using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;
using WorkEz.Api.Services;
using System.Security.Claims;

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
}
