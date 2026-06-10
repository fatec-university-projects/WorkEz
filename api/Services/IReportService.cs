using WorkEz.Api.Entities;

namespace WorkEz.Api.Services;

public interface IReportService
{
    Task<IEnumerable<Report>> GetAllAsync();
    Task<Report?> GetByIdAsync(Guid id);
    Task CreateAsync(Report report);
    Task UpdateAsync(Report report);
    Task DeleteAsync(Guid id);
}
