using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkEz.Api.Data;
using WorkEz.Api.Services;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages confirmed appointments between customers and service providers.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AppointmentsController(AppDbContext context, IAppointmentService appointmentService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllAppointments()
    {
        var list = await appointmentService.GetAllAsync();
        return Ok(list);
    }

    [HttpGet("by-customer/{customerId}")]
    public async Task<IActionResult> GetAppointmentsByCustomer(Guid customerId)
    {
        var list = await context.Appointments.AsNoTracking().Where(a => a.CustomerId == customerId).ToListAsync();
        return Ok(list);
    }

    [HttpGet("by-provider/{providerId}")]
    public async Task<IActionResult> GetAppointmentsByProvider(Guid providerId)
    {
        var list = await context.Appointments.AsNoTracking().Where(a => a.ProviderId == providerId).ToListAsync();
        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetAppointmentById(Guid id)
    {
        var appointment = await appointmentService.GetByIdAsync(id);
        return appointment is null ? NotFound() : Ok(appointment);
    }

    [HttpPatch("{id}/patch")]
    public async Task<IActionResult> UpdateAppointmentPatch(Guid id)
    {
        var existing = await appointmentService.GetByIdAsync(id);
        if (existing is null) return NotFound();
        // Placeholder: real patch logic omitted
        return NoContent();
    }

    [HttpPatch("{id}/cancel")]
    public async Task<IActionResult> UpdateAppointmentCancel(Guid id)
    {
        var existing = await appointmentService.GetByIdAsync(id);
        if (existing is null) return NotFound();
        // Placeholder: set status to cancelled when enum exists
        return NoContent();
    }

    [HttpPatch("{id}/complete")]
    public async Task<IActionResult> UpdateAppointmentComplete(Guid id)
    {
        var existing = await appointmentService.GetByIdAsync(id);
        if (existing is null) return NotFound();
        // Placeholder: set status to completed when enum exists
        return NoContent();
    }
}
