using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages confirmed appointments between customers and service providers.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AppointmentsController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllAppointments()
    {
        throw notimplementedException;
    }
    [HttpGet("by-customer/{customerId}")]
    public async Task<IActionResult> GetAppointmentsByCustomer(Guid customerId)
    {
        throw notimplementedException;
    }

    [HttpGet("by-provider/{providerId}")]
    public async Task<IActionResult> GetAppointmentsByProvider(Guid providerId)
    {
        throw notimplementedException;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetAppointmentById(Guid id)
    {
        throw notimplementedException;
    }

    [HttpPatch("{id}/patch")]
    public async Task<IActionResult> UpdateAppointmentPatch(Guid id)
    {
        throw notimplementedException;
    }

    [HttpPatch("{id}/cancel")]
    public async Task<IActionResult> UpdateAppointmentCancel(Guid id)
    {
        throw notimplementedException;
    }

    [HttpPatch("{id}/complete")]
    public async Task<IActionResult> UpdateAppointmentComplete(Guid id)
    {
        throw notimplementedException;
    }
}
