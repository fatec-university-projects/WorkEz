using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages chat conversations between customers and service providers.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ConversationsController(AppDbContext context) : ControllerBase
{
    [HttpGet("by-service/{serviceId}")]
    public async Task<IActionResult> GetConversationsByService(Guid serviceId)
    {
        throw notimplementedException;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetConversationById(Guid id)
    {
        throw notimplementedException;
    }

    [HttpGet("{id}/messages")]
    public async Task<IActionResult> GetMessages(Guid id)
    {
        throw notimplementedException;
    }

    [HttpPost("{id}/messages")]
    public async Task<IActionResult> CreateMessage(Guid id, Message message)
    {
        throw notimplementedException;
    }

    [HttpPatch("{id}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        throw notimplementedException;
    }

}
