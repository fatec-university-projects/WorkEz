using WorkEz.Api.Entities;

namespace WorkEz.Api.Services;

public interface IAdministratorService
{
    Task<IEnumerable<Administrator>> GetAllAsync();
    Task<Administrator?> GetByIdAsync(Guid id);
    Task CreateAsync(Administrator administrator);
    Task UpdateAsync(Administrator administrator);
    Task DeleteAsync(Guid id);
}
