using WorkEz.Domain.Common;
using WorkEz.Domain.Interfaces;

namespace WorkEz.Domain.Services;

public abstract class BaseService<TEntity>(IBaseRepository<TEntity> repository) : IBaseService<TEntity> where TEntity : BaseEntity
{
    protected readonly IBaseRepository<TEntity> Repository = repository;

    public virtual async Task<TEntity?> GetByIdAsync(Guid id) => await Repository.GetByIdAsync(id);
    public virtual async Task<IEnumerable<TEntity>> GetAllAsync() => await Repository.GetAllAsync();

    public virtual async Task<Result<TEntity>> CreateAsync(TEntity entity)
    {
        await Repository.AddAsync(entity);
        await Repository.SaveChangesAsync();
        return Result<TEntity>.Success(entity);
    }

    public virtual async Task<Result> UpdateAsync(TEntity entity)
    {
        var existing = await Repository.GetByIdAsync(entity.Id);
        if (existing is null) return Result.Failure("Entity not found", "NOT_FOUND");
        Repository.Update(entity);
        await Repository.SaveChangesAsync();
        return Result.Success();
    }

    public virtual async Task<Result> DeleteAsync(Guid id)
    {
        var entity = await Repository.GetByIdAsync(id);
        if (entity is null) return Result.Failure("Entity not found", "NOT_FOUND");
        Repository.Remove(entity);
        await Repository.SaveChangesAsync();
        return Result.Success();
    }
}
