using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;
using Microsoft.EntityFrameworkCore;
using WorkEz.Api.Entities;
using WorkEz.Api.Services;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages the geographic service areas registered by providers.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ServiceAreasController(AppDbContext context, IServiceAreaService serviceAreaService) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("by-provider/{providerId}")]
    public async Task<IActionResult> GetServiceAreasByProvider(Guid providerId)
    {
        var list = await context.ServiceAreas.AsNoTracking().Where(sa => sa.ProviderId == providerId).ToListAsync();
        return Ok(list);
    }

    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetServiceAreaById(Guid id)
    {
        var sa = await serviceAreaService.GetByIdAsync(id);
        return sa is null ? NotFound() : Ok(sa);
    }

    [AllowAnonymous]
    [HttpPost("by-provider/{providerId}")]
    public async Task<IActionResult> CreateServiceArea(Guid providerId, [FromBody] ServiceArea serviceArea)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        serviceArea.ProviderId = providerId;
        await serviceAreaService.CreateAsync(serviceArea);
        return CreatedAtAction(nameof(GetServiceAreaById), new { id = serviceArea.Id }, serviceArea);
    }

    [AllowAnonymous]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateServiceArea(Guid id, [FromBody] ServiceArea serviceArea)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (id != serviceArea.Id) return BadRequest(new { message = "Id mismatch." });
        var existing = await serviceAreaService.GetByIdAsync(id);
        if (existing is null) return NotFound();
        await serviceAreaService.UpdateAsync(serviceArea);
        return NoContent();
    }

    [AllowAnonymous]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteServiceArea(Guid id)
    {
        var existing = await serviceAreaService.GetByIdAsync(id);
        if (existing is null) return NotFound();
        await serviceAreaService.DeleteAsync(id);
        return NoContent();
    }
}
