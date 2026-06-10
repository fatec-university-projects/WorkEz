using WorkEz.Api.Entities;

namespace WorkEz.Api.Services;

public interface IServiceService
{
    Task<IEnumerable<Service>> GetAllAsync();
    Task<Service?> GetByIdAsync(Guid id);
    Task CreateAsync(Service service);
    Task UpdateAsync(Service service);
    Task DeleteAsync(Guid id);
}
