using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages complaint reports filed by users against other users.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ReportsController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllReports()
    {
        throw notimplementedException;
    }

    [HttpGet("{Id}")]
    public async Task<IActionResult> GetReportById(Guid id)
    {
        throw notimplementedException;
    }

    [HttpPost("{appointmentId}")]
    public async Task<IActionResult> CreateReport(Guid appointmentId, Report report)
    {
        throw notimplementedException;
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateReportStatus(Guid id)
    {
        throw notimplementedException;
    }
}
