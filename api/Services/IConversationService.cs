using WorkEz.Api.Entities;

namespace WorkEz.Api.Services;

public interface IConversationService
{
    Task<IEnumerable<Conversation>> GetAllAsync();
    Task<Conversation?> GetByIdAsync(Guid id);
    Task CreateAsync(Conversation conversation);
    Task UpdateAsync(Conversation conversation);
    Task DeleteAsync(Guid id);
}
