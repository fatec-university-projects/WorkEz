using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkEz.Api.Data;
using WorkEz.Api.Entities;
using WorkEz.Api.Services;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages chat conversations between customers and service providers.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ConversationsController(AppDbContext context, IConversationService conversationService) : ControllerBase
{
    [HttpGet("by-service/{serviceId}")]
    public async Task<IActionResult> GetConversationsByService(Guid serviceId)
    {
        var list = await context.Conversations.AsNoTracking().Where(c => c.ServiceId == serviceId).ToListAsync();
        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetConversationById(Guid id)
    {
        var conv = await conversationService.GetByIdAsync(id);
        return conv is null ? NotFound() : Ok(conv);
    }

    [HttpGet("{id}/messages")]
    public async Task<IActionResult> GetMessages(Guid id)
    {
        var messages = await context.Messages.AsNoTracking().Where(m => m.ConversationId == id).OrderBy(m => m.CreatedAt).ToListAsync();
        return Ok(messages);
    }

    [HttpPost("{id}/messages")]
    public async Task<IActionResult> CreateMessage(Guid id, [FromBody] Message message)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        message.ConversationId = id;
        context.Messages.Add(message);
        await context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetMessages), new { id = id }, message);
    }

    [HttpPatch("{id}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        var msgs = await context.Messages.Where(m => m.ConversationId == id && !m.IsRead).ToListAsync();
        if (!msgs.Any()) return NoContent();
        foreach (var m in msgs) m.IsRead = true;
        await context.SaveChangesAsync();
        return NoContent();
    }

}
