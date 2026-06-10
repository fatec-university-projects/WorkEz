using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkEz.Api.Data;
using WorkEz.Api.Entities;
using WorkEz.Api.Services;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages user addresses used for service locations.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AddressesController(AppDbContext context, IAddressService addressService) : ControllerBase
{
    [HttpGet("by-user/{userId}")]
    public async Task<IActionResult> GetAddressesByUser(Guid userId)
    {
        var list = await context.Addresses
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetAddressById(Guid id)
    {
        var address = await addressService.GetByIdAsync(id);
        return address is null ? NotFound() : Ok(address);
    }

    [HttpPost("by-user/{userId}")]
    public async Task<IActionResult> CreateAddress(Guid userId, [FromBody] Address address)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        address.UserId = userId;
        await addressService.CreateAsync(address);

        return CreatedAtAction(nameof(GetAddressById), new { id = address.Id }, address);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAddress(Guid id, [FromBody] Address address)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (id != address.Id)
            return BadRequest(new { message = "Id mismatch." });

        var existing = await addressService.GetByIdAsync(id);
        if (existing is null) return NotFound();

        await addressService.UpdateAsync(address);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAddress(Guid id)
    {
        var existing = await addressService.GetByIdAsync(id);
        if (existing is null) return NotFound();

        await addressService.DeleteAsync(id);
        return NoContent();
    }
}
