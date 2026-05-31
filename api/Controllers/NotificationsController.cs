using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages system notifications delivered to users.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class NotificationsController(AppDbContext context) : ControllerBase
{
    [HttpGet("by-user/{userId}")]
    public async Task<IActionResult> GetNotificationsByUser(Guid userId)
    {
        throw notimplementedException;
    }

    [HttpPatch("mark-read/{id}")]
    public async Task<IActionResult> MarkNotificationAsRead(Guid id)
    {
        throw notimplementedException;
    }

    [HttpPatch("mark-all-read/{userId}")]
    public async Task<IActionResult> MarkAllNotificationsAsReadByUser(Guid userId)
    {
        throw notimplementedException;
    }
}
