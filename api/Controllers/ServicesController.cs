using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;
using Microsoft.EntityFrameworkCore;
using WorkEz.Api.Entities;
using WorkEz.Api.Services;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages service requests created by customers.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ServicesController(AppDbContext context, IServiceService serviceService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllServices()
    {
        var list = await serviceService.GetAllAsync();
        return Ok(list);
    }

    [HttpGet("by-customer/{customerId}")]
    public async Task<IActionResult> GetServicesByCustomer(Guid customerId)
    {
        var list = await context.Services.AsNoTracking().Where(s => s.CustomerId == customerId).ToListAsync();
        return Ok(list);
    }

    [HttpGet("by-provider/{providerId}")]
    public async Task<IActionResult> GetServicesByProvider(Guid providerId)
    {
        var list = await context.Services
            .AsNoTracking()
            .Where(s => s.Proposals.Any(p => p.ProviderId == providerId))
            .ToListAsync();
        return Ok(list);
    }

    [HttpGet("nearby-services/{customerId}")]
    public async Task<IActionResult> GetNearbyServices(Guid customerId)
    {
        // Placeholder: use geo lookup in real implementation
        var list = await serviceService.GetAllAsync();
        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetServiceById(Guid id)
    {
        var s = await serviceService.GetByIdAsync(id);
        return s is null ? NotFound() : Ok(s);
    }

    [HttpPost("by-customer/{customerId}")]
    public async Task<IActionResult> CreateService(Guid customerId, [FromBody] Service service)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        service.CustomerId = customerId;
        await serviceService.CreateAsync(service);
        return CreatedAtAction(nameof(GetServiceById), new { id = service.Id }, service);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateService(Guid id, [FromBody] Service service)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (id != service.Id) return BadRequest(new { message = "Id mismatch." });
        var existing = await serviceService.GetByIdAsync(id);
        if (existing is null) return NotFound();
        await serviceService.UpdateAsync(service);
        return NoContent();
    }
    
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateServiceStatus(Guid id, bool status)
    {
        var s = await serviceService.GetByIdAsync(id);
        if (s is null) return NotFound();
        s.ServiceStatus = status ? Enums.ServiceStatus.Open : Enums.ServiceStatus.Cancelled;
        await serviceService.UpdateAsync(s);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteService(Guid id)
    {
        var existing = await serviceService.GetByIdAsync(id);
        if (existing is null) return NotFound();
        await serviceService.DeleteAsync(id);
        return NoContent();
    }
}
