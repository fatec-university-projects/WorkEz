using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkEz.Api.Data;
using WorkEz.Api.Entities;
using WorkEz.Api.Services;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages administrator accounts and access levels.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AdministratorsController(AppDbContext context, IAdministratorService adminService) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetAdministratorById(Guid id)
    {
        var admin = await adminService.GetByIdAsync(id);
        return admin is null ? NotFound() : Ok(admin);
    }

    [AllowAnonymous]
    [HttpGet("by-user/{userId}")]
    public async Task<IActionResult> GetAdministratorByUser(Guid userId)
    {
        var admin = await context.Administrators.AsNoTracking().FirstOrDefaultAsync(a => a.UserId == userId);
        return admin is null ? NotFound() : Ok(admin);
    }

    [AllowAnonymous]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAdministrator(Guid id, [FromBody] Administrator administrator)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (id != administrator.Id) return BadRequest(new { message = "Id mismatch." });

        var existing = await adminService.GetByIdAsync(id);
        if (existing is null) return NotFound();

        await adminService.UpdateAsync(administrator);
        return NoContent();
    }
}
