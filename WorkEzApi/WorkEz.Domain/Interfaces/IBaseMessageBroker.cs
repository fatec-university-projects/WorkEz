using WorkEz.Domain.Events;

namespace WorkEz.Domain.Interfaces;

public interface IBaseMessageBroker
{
    Task PublishAsync<TEvent>(TEvent domainEvent, CancellationToken cancellationToken = default) where TEvent : class, IDomainEvent;
}
