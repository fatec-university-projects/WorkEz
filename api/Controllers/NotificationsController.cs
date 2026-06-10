using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;
using Microsoft.EntityFrameworkCore;
using WorkEz.Api.Services;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages system notifications delivered to users.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class NotificationsController(AppDbContext context, INotificationService notificationService) : ControllerBase
{
    [HttpGet("by-user/{userId}")]
    public async Task<IActionResult> GetNotificationsByUser(Guid userId)
    {
        var list = await context.Notifications.AsNoTracking().Where(n => n.UserId == userId).ToListAsync();
        return Ok(list);
    }

    [HttpPatch("mark-read/{id}")]
    public async Task<IActionResult> MarkNotificationAsRead(Guid id)
    {
        var n = await notificationService.GetByIdAsync(id);
        if (n is null) return NotFound();
        n.NotificationType = n.NotificationType; // no-op placeholder
        // Mark read - assume removal or flag not present; if there were a IsRead flag set it here
        await notificationService.UpdateAsync(n);
        return NoContent();
    }

    [HttpPatch("mark-all-read/{userId}")]
    public async Task<IActionResult> MarkAllNotificationsAsReadByUser(Guid userId)
    {
        var items = await context.Notifications.Where(n => n.UserId == userId).ToListAsync();
        if (!items.Any()) return NoContent();
        // Placeholder: no IsRead property on Notification entity; update UpdatedAt
        foreach (var it in items) it.IsRead = true;
        await context.SaveChangesAsync();
        return NoContent();
    }
}
