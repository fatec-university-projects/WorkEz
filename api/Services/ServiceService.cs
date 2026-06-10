using WorkEz.Api.Data;
using WorkEz.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace WorkEz.Api.Services;

public class ServiceService(AppDbContext context) : IServiceService
{
    public async Task<IEnumerable<Service>> GetAllAsync()
        => await context.Services.AsNoTracking().ToListAsync();

    public async Task<Service?> GetByIdAsync(Guid id)
        => await context.Services.FindAsync(id);

    public async Task CreateAsync(Service service)
    {
        context.Services.Add(service);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Service service)
    {
        context.Services.Update(service);
        await context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await context.Services.FindAsync(id);
        if (entity is null) return;
        context.Services.Remove(entity);
        await context.SaveChangesAsync();
    }
}
