using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages reviews submitted after completed appointments.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ReviewsController(AppDbContext context) : ControllerBase
{
    [HttpGet("by-user/{userId}")]
    public async Task<IActionResult> GetReportsByUser(Guid userId)
    {
        throw notimplementedException;
    }

    [HttpGet("by-appointment/{appointmentId}")]
    public async Task<IActionResult> GetReportsByAppointment(Guid appointmentId)
    {
        throw notimplementedException;
    }

    [HttpPost("by-customer/{customerId}")]
    public async Task<IActionResult> CreateReview(Guid customerId, Review review)
    {
        throw notimplementedException;
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteReview(Guid id)
    {
        throw notimplementedException;
    }
}
