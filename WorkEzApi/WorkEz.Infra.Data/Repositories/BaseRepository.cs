using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using WorkEz.Domain.Common;
using WorkEz.Domain.Interfaces;
using WorkEz.Infra.Data.Context;

namespace WorkEz.Infra.Data.Repositories;

public class BaseRepository<TEntity>(AppDbContext context) : IBaseRepository<TEntity> where TEntity : BaseEntity
{
    protected readonly AppDbContext Context = context;
    protected readonly DbSet<TEntity> DbSet = context.Set<TEntity>();

    public virtual async Task<TEntity?> GetByIdAsync(Guid id) => await DbSet.FindAsync(id);
    public virtual async Task<IEnumerable<TEntity>> GetAllAsync() => await DbSet.AsNoTracking().ToListAsync();
    public virtual async Task<IEnumerable<TEntity>> FindAsync(Expression<Func<TEntity, bool>> predicate) => await DbSet.Where(predicate).AsNoTracking().ToListAsync();
    public virtual async Task AddAsync(TEntity entity) => await DbSet.AddAsync(entity);
    public virtual void Update(TEntity entity) { entity.Touch(); DbSet.Update(entity); }
    public virtual void Remove(TEntity entity) => DbSet.Remove(entity);
    public virtual async Task<int> SaveChangesAsync() => await Context.SaveChangesAsync();
}
