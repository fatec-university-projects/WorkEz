using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;
using WorkEz.Api.Entities;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages service provider profiles, verification, availability and ratings.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ServiceProvidersController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllServiceProviders()
    {
        throw notimplementedException;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetServiceProviderById(Guid id)
    {
        throw notimplementedException;
    }

    [HttpGet("by-user/{userId}")]
    public async Task<IActionResult> GetServiceProviderByUser(Guid userId)
    {
        throw notimplementedException;
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateServiceProvider(Guid id, ServiceProvider serviceProvider)
    {
        throw notimplementedException;
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateServiceProviderStatus(Guid id, bool status)
    {
        throw notimplementedException;
    }
}
