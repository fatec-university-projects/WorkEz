using System.Linq.Expressions;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;

namespace WorkEz.Domain.Interfaces;

public interface IBaseRepository<TEntity> where TEntity : BaseEntity
{
    Task<TEntity?> GetByIdAsync(Guid id);
    Task<IEnumerable<TEntity>> GetAllAsync();
    Task<IEnumerable<TEntity>> FindAsync(Expression<Func<TEntity, bool>> predicate);
    Task AddAsync(TEntity entity);
    void Update(TEntity entity);
    void Remove(TEntity entity);
    Task<int> SaveChangesAsync();
}

public interface IProposalRepository : IBaseRepository<Proposal>
{
    Task<Proposal?> GetByIdWithServiceAndProviderAsync(Guid id);
    Task<IEnumerable<Proposal>> GetProposalsByServiceIdAsync(Guid serviceId);
    Task<IEnumerable<Proposal>> GetPendingProposalsByServiceIdAsync(Guid serviceId);
    Task<Proposal?> GetExistingProposalAsync(Guid serviceId, Guid providerId);
}

public interface IServiceRepository : IBaseRepository<Service>
{
    Task<Service?> GetByIdWithDetailsAsync(Guid id);
    Task<IEnumerable<Service>> GetServicesByCustomerAsync(Guid customerId);
}

public interface IAppointmentRepository : IBaseRepository<Appointment>
{
    Task<Appointment?> GetByServiceIdAsync(Guid serviceId);
}

public interface IDomainEvent
{
    Guid EventId { get; }
    DateTime OccurredOn { get; }
}

public interface IBaseMessageBroker
{
    Task PublishAsync<TEvent>(TEvent domainEvent, CancellationToken cancellationToken = default) where TEvent : class, IDomainEvent;
}
