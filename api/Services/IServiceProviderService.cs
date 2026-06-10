using WorkEz.Api.Entities;
using WkServiceProvider = WorkEz.Api.Entities.ServiceProvider;

namespace WorkEz.Api.Services;

public interface IServiceProviderService
{
    Task<IEnumerable<WkServiceProvider>> GetAllAsync();
    Task<WkServiceProvider?> GetByIdAsync(Guid id);
    Task CreateAsync(WkServiceProvider provider);
    Task UpdateAsync(WkServiceProvider provider);
    Task DeleteAsync(Guid id);
}
