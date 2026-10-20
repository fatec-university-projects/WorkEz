using System.Linq.Expressions;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;

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
    Task<IEnumerable<Appointment>> GetByProviderIdWithDetailsAsync(Guid providerId);
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

public interface ITrackingNotificationService
{
    Task NotifyServiceUpdateAsync(Guid serviceId, string eventType, object? payload = null);
}

public interface IChatNotificationService
{
    Task NotifyChatUpdateAsync(Guid proposalId, Guid? serviceId, string eventType, object? payload = null);
    bool HasActiveSubscribers(Guid? proposalId, Guid? serviceId);
}

public interface ICategoryRepository : IBaseRepository<Category>
{
    Task<IEnumerable<Category>> GetAllOrderedByNameAsync();
    Task<IEnumerable<Category>> GetByProviderIdAsync(Guid providerId);
    Task UpdateProviderCategoriesAsync(Guid providerId, IEnumerable<Guid> categoryIds);
}

public interface ICustomerRepository : IBaseRepository<Customer>
{
    Task<Customer?> GetByUserIdWithUserAsync(Guid userId);
    Task<Customer?> GetByIdWithUserAsync(Guid id);
}

public interface IReviewRepository : IBaseRepository<Review>
{
    Task<Review?> GetByServiceOrAppointmentAsync(Guid serviceId, Guid? appointmentId, Guid reviewerUserId);
    Task<Review?> GetByAppointmentAndReviewerAsync(Guid appointmentId, Guid reviewerUserId);
    Task<Review?> GetReviewByServiceAsync(Guid serviceId);
    Task<Review?> GetReviewByAppointmentAsync(Guid appointmentId);
    Task<IEnumerable<Review>> GetReviewsByReviewedUserIdAsync(Guid userId);
    Task<List<int>> GetRatingsForUserAsync(Guid userId);
}

public interface IUserRepository : IBaseRepository<User>
{
    Task<User?> GetByEmailAsync(string email);
    Task<bool> IsEmailInUseAsync(string email, Guid excludeUserId);
}

public interface IRefreshTokenRepository : IBaseRepository<RefreshToken>
{
    Task<RefreshToken?> GetByTokenWithUserAsync(string token);
    Task<RefreshToken?> GetByTokenAsync(string token);
}

public interface ITokenService
{
    string CreateAccessToken(User user);
    string GenerateRefreshToken();
    DateTime RefreshTokenExpiresAt { get; }
    int AccessTokenLifetimeSeconds { get; }
}

public interface IPasswordHasher
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string passwordHash);
}

public interface IWalletTransactionRepository : IBaseRepository<WalletTransaction>
{
    Task<IEnumerable<WalletTransaction>> GetByProviderIdAsync(Guid providerId);
    Task<IEnumerable<WalletTransaction>> GetByProviderIdFilteredAsync(
        Guid providerId,
        WalletTransactionType? type = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        int skip = 0,
        int take = 20);
    Task<int> CountByProviderIdFilteredAsync(
        Guid providerId,
        WalletTransactionType? type = null,
        DateTime? startDate = null,
        DateTime? endDate = null);
    Task<WalletTransaction?> GetEscrowHoldByServiceIdAsync(Guid serviceId);
    Task<WalletTransaction?> GetEscrowReleaseByServiceIdAsync(Guid serviceId);
}

public interface IWithdrawalRequestRepository : IBaseRepository<WithdrawalRequest>
{
    Task<IEnumerable<WithdrawalRequest>> GetByProviderIdAsync(Guid providerId);
    Task<WithdrawalRequest?> GetLatestByProviderIdAsync(Guid providerId);
}

public record PixInvoiceEmailDto(
    string RecipientEmail,
    string RecipientName,
    Guid ServiceId,
    string ServiceTitle,
    string ProviderName,
    decimal TotalAmount,
    decimal LaborAmount,
    decimal MaterialsAmount,
    string PixCopiaECola,
    string? QrCodeBase64,
    DateTime ExpiresAt
);
