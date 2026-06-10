using WorkEz.Api.Data;
using WorkEz.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace WorkEz.Api.Services;

public class ConversationService(AppDbContext context) : IConversationService
{
    public async Task<IEnumerable<Conversation>> GetAllAsync()
        => await context.Conversations.AsNoTracking().ToListAsync();

    public async Task<Conversation?> GetByIdAsync(Guid id)
        => await context.Conversations.FindAsync(id);

    public async Task CreateAsync(Conversation conversation)
    {
        context.Conversations.Add(conversation);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Conversation conversation)
    {
        context.Conversations.Update(conversation);
        await context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await context.Conversations.FindAsync(id);
        if (entity is null) return;
        context.Conversations.Remove(entity);
        await context.SaveChangesAsync();
    }
}
