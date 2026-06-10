using WorkEz.Api.Entities;

namespace WorkEz.Api.Services;

public interface IServiceAreaService
{
    Task<IEnumerable<ServiceArea>> GetAllAsync();
    Task<ServiceArea?> GetByIdAsync(Guid id);
    Task CreateAsync(ServiceArea serviceArea);
    Task UpdateAsync(ServiceArea serviceArea);
    Task DeleteAsync(Guid id);
}
