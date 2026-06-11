using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkEz.Api.Data;
using WorkEz.Api.Entities;
using WorkEz.Api.Services;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages customer-specific profile data.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class CustomersController(AppDbContext context, ICustomerService customerService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllCustomers()
    {
        var list = await customerService.GetAllAsync();
        return Ok(list);
    }

    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetCustomerById(Guid id)
    {
        var entity = await customerService.GetByIdAsync(id);
        return entity is null ? NotFound() : Ok(entity);
    }

    [AllowAnonymous]
    [HttpGet("by-user/{userId}")]
    public async Task<IActionResult> GetCustomerByUser(Guid userId)
    {
        var entity = await context.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.UserId == userId);
        return entity is null ? NotFound() : Ok(entity);
    }

    [AllowAnonymous]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCustomer(Guid id, [FromBody] Customer customer)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (id != customer.Id) return BadRequest(new { message = "Id mismatch." });
        var existing = await customerService.GetByIdAsync(id);
        if (existing is null) return NotFound();
        await customerService.UpdateAsync(customer);
        return NoContent();
    }

    [AllowAnonymous]
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateCustomerStatus(Guid id, bool status)
    {
        var customer = await context.Customers.Include(c => c.User).FirstOrDefaultAsync(c => c.Id == id);
        if (customer is null) return NotFound();
        customer.User.AccountStatus = status ? Enums.AccountStatus.Active : Enums.AccountStatus.Inactive;
        await context.SaveChangesAsync();
        return NoContent();
    }
}
