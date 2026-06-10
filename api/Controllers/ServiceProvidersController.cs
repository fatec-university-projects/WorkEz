using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;
using WorkEz.Api.Entities;
using Microsoft.EntityFrameworkCore;
using WorkEz.Api.Services;
using WkServiceProvider = WorkEz.Api.Entities.ServiceProvider;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages service provider profiles, verification, availability and ratings.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ServiceProvidersController(AppDbContext context, IServiceProviderService providerService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllServiceProviders()
    {
        var list = await providerService.GetAllAsync();
        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetServiceProviderById(Guid id)
    {
        var p = await providerService.GetByIdAsync(id);
        return p is null ? NotFound() : Ok(p);
    }

    [HttpGet("by-user/{userId}")]
    public async Task<IActionResult> GetServiceProviderByUser(Guid userId)
    {
        var p = await context.Providers.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId);
        return p is null ? NotFound() : Ok(p);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateServiceProvider(Guid id, [FromBody] WkServiceProvider serviceProvider)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (id != serviceProvider.Id) return BadRequest(new { message = "Id mismatch." });
        var existing = await providerService.GetByIdAsync(id);
        if (existing is null) return NotFound();
        await providerService.UpdateAsync(serviceProvider);
        return NoContent();
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateServiceProviderStatus(Guid id, bool status)
    {
        var existing = await providerService.GetByIdAsync(id);
        if (existing is null) return NotFound();
        existing.AvailabilityStatus = status ? Enums.AvailabilityStatus.Available : Enums.AvailabilityStatus.Unavailable;
        await providerService.UpdateAsync(existing);
        return NoContent();
    }
}
