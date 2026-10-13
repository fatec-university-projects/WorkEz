namespace WorkEz.Domain.Events;

public record ProposalSubmittedEvent(Guid EventId, DateTime OccurredOn, Guid ProposalId, Guid ServiceId, Guid ProviderId, decimal ProposedPrice) : IDomainEvent;
public record ProposalAcceptedEvent(Guid EventId, DateTime OccurredOn, Guid ProposalId, Guid ServiceId, Guid CustomerId, Guid ProviderId, decimal AgreedPrice, Guid AppointmentId) : IDomainEvent;
public record ProposalRejectedEvent(Guid EventId, DateTime OccurredOn, Guid ProposalId, Guid ServiceId, Guid CustomerId, string? Reason) : IDomainEvent;
