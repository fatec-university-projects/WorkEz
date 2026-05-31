using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages user addresses used for service locations.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AddressesController(AppDbContext context) : ControllerBase
{
    [HttpGet("by-user/{userId}")]
    public async Task<IActionResult> GetAddressesByUser(Guid userId)
    {
        throw notimplementedException;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetAddressById(Guid id)
    {
        throw notimplementedException;
    }

    [HttpPost("by-user/{userId}")]
    public async Task<IActionResult> CreateAddress(Guid userId, Address address)
    {
        throw notimplementedException;
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAddress(Guid id, Address address)
    {
        throw notimplementedException;
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAddress(Guid id)
    {
        throw notimplementedException;
    }
}
