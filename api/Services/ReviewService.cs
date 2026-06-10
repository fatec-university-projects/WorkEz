using WorkEz.Api.Data;
using WorkEz.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace WorkEz.Api.Services;

public class ReviewService(AppDbContext context) : IReviewService
{
    public async Task<IEnumerable<Review>> GetAllAsync()
        => await context.Reviews.AsNoTracking().ToListAsync();

    public async Task<Review?> GetByIdAsync(Guid id)
        => await context.Reviews.FindAsync(id);

    public async Task CreateAsync(Review review)
    {
        context.Reviews.Add(review);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Review review)
    {
        context.Reviews.Update(review);
        await context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await context.Reviews.FindAsync(id);
        if (entity is null) return;
        context.Reviews.Remove(entity);
        await context.SaveChangesAsync();
    }
}
