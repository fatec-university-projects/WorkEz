using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;
using Microsoft.EntityFrameworkCore;
using WorkEz.Api.Entities;
using WorkEz.Api.Services;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages complaint reports filed by users against other users.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ReportsController(AppDbContext context, IReportService reportService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllReports()
    {
        var list = await reportService.GetAllAsync();
        return Ok(list);
    }

    [AllowAnonymous]
    [HttpGet("{Id}")]
    public async Task<IActionResult> GetReportById(Guid id)
    {
        var r = await reportService.GetByIdAsync(id);
        return r is null ? NotFound() : Ok(r);
    }

    [AllowAnonymous]
    [HttpPost("{appointmentId}")]
    public async Task<IActionResult> CreateReport(Guid appointmentId, [FromBody] Report report)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        report.AppointmentId = appointmentId;
        await reportService.CreateAsync(report);
        return CreatedAtAction(nameof(GetReportById), new { id = report.Id }, report);
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateReportStatus(Guid id)
    {
        var r = await reportService.GetByIdAsync(id);
        if (r is null) return NotFound();
        // Placeholder: update status
        return NoContent();
    }
}
