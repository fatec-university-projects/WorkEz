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

    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetServiceProviderById(Guid id)
    {
        var p = await providerService.GetByIdAsync(id);
        return p is null ? NotFound() : Ok(p);
    }

    [AllowAnonymous]
    [HttpGet("by-user/{userId}")]
    public async Task<IActionResult> GetServiceProviderByUser(Guid userId)
    {
        var p = await context.Providers
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.UserId == userId);
        if (p is null)
        {
            var user = await context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user is not null)
            {
                p = new WkServiceProvider 
                { 
                    UserId = userId,
                    ProfessionalDescription = "Novo prestador de serviços"
                };
                context.Providers.Add(p);
                await context.SaveChangesAsync();
                
                // Re-fetch to populate navigation properties
                p = await context.Providers
                    .Include(x => x.User)
                    .FirstOrDefaultAsync(x => x.Id == p.Id);
            }
        }
        if (p is null) return NotFound();

        return Ok(new
        {
            id = p.Id,
            userId = p.UserId,
            name = p.User?.Name ?? string.Empty,
            email = p.User?.Email ?? string.Empty,
            phone = p.User?.Phone,
            photo = p.User?.ProfilePicture,
            professionalDescription = p.ProfessionalDescription,
            averageRating = p.AverageRating,
            completedServicesCount = p.CompletedServicesCount,
            availabilityStatus = p.AvailabilityStatus.ToString(),
            documentVerified = p.DocumentVerified
        });
    }

    [AllowAnonymous]
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

    [AllowAnonymous]
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
