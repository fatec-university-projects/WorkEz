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
    Task<IEnumerable<Proposal>> GetProposalsByProviderUserIdAsync(Guid providerUserId);
}

public interface IServiceRepository : IBaseRepository<Service>
{
    Task<Service?> GetByIdWithDetailsAsync(Guid id);
    Task<IEnumerable<Service>> GetServicesByCustomerAsync(Guid customerId);
}

public interface IServiceProviderRepository : IBaseRepository<ServiceProvider>
{
    Task<ServiceProvider?> GetByUserIdAsync(Guid userId);
    Task<ServiceProvider?> GetByIdWithUserAsync(Guid id);
    Task<ServiceProvider?> GetWithDetailsByUserIdAsync(Guid userId);
    Task<ServiceProvider?> GetWithDetailsByIdAsync(Guid id);
    Task<List<string>> GetPortfolioAsync(Guid providerId);
    Task<bool> AddPortfolioImageAsync(Guid providerId, string imageUrl);
    Task<bool> RemovePortfolioImageAsync(Guid providerId, string imageUrl);
    Task<List<(Guid Id, string Name)>> GetSpecialtiesAsync(Guid providerId);
}

public interface IAppointmentRepository : IBaseRepository<Appointment>
{
    Task<Appointment?> GetByServiceIdAsync(Guid serviceId);
}

public interface IChatMessageRepository : IBaseRepository<ChatMessage>
{
    Task<IEnumerable<ChatMessage>> GetByProposalIdAsync(Guid proposalId);
    Task<IEnumerable<ChatMessage>> GetByServiceIdAsync(Guid serviceId);
    Task<ChatMessage> SendMessageAsync(Guid? proposalId, Guid? serviceId, Guid senderId, string content, bool isFromProvider);
    Task<ChatMessage> SendMessageAsync(Guid proposalId, Guid senderId, string content, bool isFromProvider);
}

public interface IUserDeviceTokenRepository : IBaseRepository<UserDeviceToken>
{
    Task<UserDeviceToken?> GetByTokenAsync(string token);
    Task<IEnumerable<UserDeviceToken>> GetByUserIdAsync(Guid userId);
    Task<IEnumerable<UserDeviceToken>> GetByUserIdsAsync(IEnumerable<Guid> userIds);
    Task<UserDeviceToken> RegisterOrUpdateAsync(Guid userId, string token, string? platform);
    Task RemoveByTokenAsync(string token);
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
