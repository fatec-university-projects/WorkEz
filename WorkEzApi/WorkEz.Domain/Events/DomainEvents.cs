namespace WorkEz.Domain.Events;

public record OrderStatusUpdatedEvent(
    Guid EventId,
    DateTime OccurredOn,
    Guid ServiceId,
    string OldStatus,
    string NewStatus,
    string? Observations
) : IDomainEvent;

public record ProviderAcceptedServiceEvent(
    Guid EventId,
    DateTime OccurredOn,
    Guid ServiceId,
    Guid ProviderId,
    decimal AgreedPrice,
    DateTime? ScheduledDate
) : IDomainEvent;

public record PaymentCompletedEvent(
    Guid EventId,
    DateTime OccurredOn,
    Guid ServiceId,
    Guid CustomerId,
    decimal Amount,
    string PaymentMethod,
    string TransactionId
) : IDomainEvent;

public record UserRegisteredEvent(
    Guid EventId,
    DateTime OccurredOn,
    Guid UserId,
    string Name,
    string Email,
    string Role
) : IDomainEvent;
