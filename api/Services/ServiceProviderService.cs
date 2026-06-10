using WorkEz.Api.Data;
using WorkEz.Api.Entities;
using Microsoft.EntityFrameworkCore;
using WkServiceProvider = WorkEz.Api.Entities.ServiceProvider;

namespace WorkEz.Api.Services;

public class ServiceProviderService(AppDbContext context) : IServiceProviderService
{
    public async Task<IEnumerable<WkServiceProvider>> GetAllAsync()
        => await context.Providers.AsNoTracking().ToListAsync();

    public async Task<WkServiceProvider?> GetByIdAsync(Guid id)
        => await context.Providers.FindAsync(id);

    public async Task CreateAsync(WkServiceProvider provider)
    {
        context.Providers.Add(provider);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(WkServiceProvider provider)
    {
        context.Providers.Update(provider);
        await context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await context.Providers.FindAsync(id);
        if (entity is null) return;
        context.Providers.Remove(entity);
        await context.SaveChangesAsync();
    }
}
