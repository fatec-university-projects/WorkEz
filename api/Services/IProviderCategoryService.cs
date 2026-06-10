using WorkEz.Api.Entities;

namespace WorkEz.Api.Services;

public interface IProviderCategoryService
{
    Task<IEnumerable<ProviderCategory>> GetAllAsync();
    Task<ProviderCategory?> GetByIdAsync(Guid id);
    Task CreateAsync(ProviderCategory providerCategory);
    Task UpdateAsync(ProviderCategory providerCategory);
    Task DeleteAsync(Guid id);
}
