using WorkEz.Api.Entities;

namespace WorkEz.Api.Services;

public interface IReviewService
{
    Task<IEnumerable<Review>> GetAllAsync();
    Task<Review?> GetByIdAsync(Guid id);
    Task CreateAsync(Review review);
    Task UpdateAsync(Review review);
    Task DeleteAsync(Guid id);
}
