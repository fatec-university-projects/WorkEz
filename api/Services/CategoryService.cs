using WorkEz.Api.Data;
using WorkEz.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace WorkEz.Api.Services;

public class CategoryService(AppDbContext context) : ICategoryService
{
    public async Task<IEnumerable<Category>> GetAllAsync()
        => await context.Categories.AsNoTracking().ToListAsync();

    public async Task<Category?> GetByIdAsync(Guid id)
        => await context.Categories.FindAsync(id);

    public async Task CreateAsync(Category category)
    {
        context.Categories.Add(category);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Category category)
    {
        context.Categories.Update(category);
        await context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await context.Categories.FindAsync(id);
        if (entity is null) return;
        context.Categories.Remove(entity);
        await context.SaveChangesAsync();
    }
}
