using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages the geographic service areas registered by providers.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ServiceAreasController(AppDbContext context) : ControllerBase
{
    [HttpGet("by-provider/{providerId}")]
    public async Task<IActionResult> GetServiceAreasByProvider(Guid providerId)
    {
        throw notimplementedException;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetServiceAreaById(Guid id)
    {
        throw notimplementedException;
    }

    [HttpPost("by-provider/{providerId}")]
    public async Task<IActionResult> CreateServiceArea(Guid providerId, ServiceArea serviceArea)
    {
        throw notimplementedException;
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateServiceArea(Guid id, ServiceArea serviceArea)
    {
        throw notimplementedException;
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteServiceArea(Guid id)
    {
        throw notimplementedException;
    }
}
