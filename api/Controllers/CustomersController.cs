using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages customer-specific profile data.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class CustomersController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllCustomers()
    {
        throw notimplementedException;
    }
    [HttpGet("{id}")]
    public async Task<IActionResult> GetCustomerById(Guid id)
    {
        throw notimplementedException;
    }

    [HttpGet("by-user/{userId}")]
    public async Task<IActionResult> GetCustomerByUser(Guid userId)
    {
        throw notimplementedException;
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCustomer(Guid id, Customer customer)
    {
        throw notimplementedException;
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateCustomerStatus(Guid id, bool status)
    {
        throw notimplementedException;
    }
}
