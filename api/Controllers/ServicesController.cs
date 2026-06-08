using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages service requests created by customers.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ServicesController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllServices()
    {
        throw notimplementedException;
    }

    [HttpGet("by-customer/{customerId}")]
    public async Task<IActionResult> GetServicesByCustomer(Guid customerId)
    {
        throw notimplementedException;
    }

    [HttpGet("by-provider/{providerId}")]
    public async Task<IActionResult> GetServicesByProvider(Guid providerId)
    {
        throw notimplementedException;
    }

    [HttpGet("nearby-services/{customerId}")]
    public async Task<IActionResult> GetNearbyServices(Guid customerId)
    {
        throw notimplementedException;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetServiceById(Guid id)
    {
        throw notimplementedException;
    }

    [HttpPost("by-customer/{customerId}")]
    public async Task<IActionResult> CreateService(Guid customerId, Service service)
    {
        throw notimplementedException;
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateService(Guid id, Service service)
    {
        throw notimplementedException;
    }
    
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateServiceStatus(Guid id, bool status)
    {
        throw notimplementedException;
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteService(Guid id)
    {
        throw notimplementedException;
    }
}
