using WorkEz.Domain.Common;

namespace WorkEz.Domain.Services;

public interface IBaseService<TEntity> where TEntity : BaseEntity
{
    Task<TEntity?> GetByIdAsync(Guid id);
    Task<IEnumerable<TEntity>> GetAllAsync();
    Task<Result<TEntity>> CreateAsync(TEntity entity);
    Task<Result> UpdateAsync(TEntity entity);
    Task<Result> DeleteAsync(Guid id);
}
