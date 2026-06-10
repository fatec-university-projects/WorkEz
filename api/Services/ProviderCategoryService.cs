using WorkEz.Api.Data;
using WorkEz.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace WorkEz.Api.Services;

public class ProviderCategoryService(AppDbContext context) : IProviderCategoryService
{
    public async Task<IEnumerable<ProviderCategory>> GetAllAsync()
        => await context.ProviderCategories.AsNoTracking().ToListAsync();

    public async Task<ProviderCategory?> GetByIdAsync(Guid id)
        => await context.ProviderCategories.FindAsync(id);

    public async Task CreateAsync(ProviderCategory providerCategory)
    {
        context.ProviderCategories.Add(providerCategory);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(ProviderCategory providerCategory)
    {
        context.ProviderCategories.Update(providerCategory);
        await context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await context.ProviderCategories.FindAsync(id);
        if (entity is null) return;
        context.ProviderCategories.Remove(entity);
        await context.SaveChangesAsync();
    }
}
