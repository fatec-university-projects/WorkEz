using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;
using Microsoft.EntityFrameworkCore;
using WorkEz.Api.Entities;
using WorkEz.Api.Services;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages reviews submitted after completed appointments.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ReviewsController(AppDbContext context, IReviewService reviewService) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("by-user/{userId}")]
    public async Task<IActionResult> GetReportsByUser(Guid userId)
    {
        var list = await context.Reviews.AsNoTracking().Where(r => r.ReviewerUserId == userId || r.ReviewedUserId == userId).ToListAsync();
        return Ok(list);
    }

    [AllowAnonymous]
    [HttpGet("by-appointment/{appointmentId}")]
    public async Task<IActionResult> GetReportsByAppointment(Guid appointmentId)
    {
        var list = await context.Reviews.AsNoTracking().Where(r => r.AppointmentId == appointmentId).ToListAsync();
        return Ok(list);
    }

    [AllowAnonymous]
    [HttpPost("by-customer/{customerId}")]
    public async Task<IActionResult> CreateReview(Guid customerId, [FromBody] Review review)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        
        var customer = await context.Customers.FirstOrDefaultAsync(c => c.Id == customerId);
        if (customer is null) return NotFound(new { message = "Cliente não encontrado." });

        review.ReviewerUserId = customer.UserId;
        await reviewService.CreateAsync(review);
        return CreatedAtAction(nameof(GetReportsByAppointment), new { appointmentId = review.AppointmentId }, review);
    }

    [AllowAnonymous]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteReview(Guid id)
    {
        var existing = await reviewService.GetByIdAsync(id);
        if (existing is null) return NotFound();
        await reviewService.DeleteAsync(id);
        return NoContent();
    }
}
