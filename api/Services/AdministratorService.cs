using WorkEz.Api.Data;
using WorkEz.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace WorkEz.Api.Services;

public class AdministratorService(AppDbContext context) : IAdministratorService
{
    public async Task<IEnumerable<Administrator>> GetAllAsync()
        => await context.Administrators.AsNoTracking().ToListAsync();

    public async Task<Administrator?> GetByIdAsync(Guid id)
        => await context.Administrators.FindAsync(id);

    public async Task CreateAsync(Administrator administrator)
    {
        context.Administrators.Add(administrator);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Administrator administrator)
    {
        context.Administrators.Update(administrator);
        await context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await context.Administrators.FindAsync(id);
        if (entity is null) return;
        context.Administrators.Remove(entity);
        await context.SaveChangesAsync();
    }
}
