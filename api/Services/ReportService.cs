using WorkEz.Api.Data;
using WorkEz.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace WorkEz.Api.Services;

public class ReportService(AppDbContext context) : IReportService
{
    public async Task<IEnumerable<Report>> GetAllAsync()
        => await context.Reports.AsNoTracking().ToListAsync();

    public async Task<Report?> GetByIdAsync(Guid id)
        => await context.Reports.FindAsync(id);

    public async Task CreateAsync(Report report)
    {
        context.Reports.Add(report);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Report report)
    {
        context.Reports.Update(report);
        await context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await context.Reports.FindAsync(id);
        if (entity is null) return;
        context.Reports.Remove(entity);
        await context.SaveChangesAsync();
    }
}
