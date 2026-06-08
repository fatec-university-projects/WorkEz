using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages administrator accounts and access levels.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AdministratorsController(AppDbContext context) : ControllerBase
{
    [HttpGet("{id}")]
    public async Task<IActionResult> GetAdministratorById(Guid id)
    {
        throw notimplementedException;
    }

    [HttpGet("by-user/{userId}")]
    public async Task<IActionResult> GetAdministratorByUser(Guid userId)
    {
        throw notimplementedException;
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAdministrator(Guid id, Administrator administrator)
    {
        throw notimplementedException;
    }
}
