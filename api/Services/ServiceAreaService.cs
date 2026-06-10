using WorkEz.Api.Data;
using WorkEz.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace WorkEz.Api.Services;

public class ServiceAreaService(AppDbContext context) : IServiceAreaService
{
    public async Task<IEnumerable<ServiceArea>> GetAllAsync()
        => await context.ServiceAreas.AsNoTracking().ToListAsync();

    public async Task<ServiceArea?> GetByIdAsync(Guid id)
        => await context.ServiceAreas.FindAsync(id);

    public async Task CreateAsync(ServiceArea serviceArea)
    {
        context.ServiceAreas.Add(serviceArea);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(ServiceArea serviceArea)
    {
        context.ServiceAreas.Update(serviceArea);
        await context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await context.ServiceAreas.FindAsync(id);
        if (entity is null) return;
        context.ServiceAreas.Remove(entity);
        await context.SaveChangesAsync();
    }
}
