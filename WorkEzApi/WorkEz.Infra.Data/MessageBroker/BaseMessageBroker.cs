using WorkEz.Domain.Events;
using WorkEz.Domain.Interfaces;

namespace WorkEz.Infra.Data.MessageBroker;

public class BaseMessageBroker : IBaseMessageBroker
{
    public virtual Task PublishAsync<TEvent>(TEvent domainEvent, CancellationToken cancellationToken = default) where TEvent : class, IDomainEvent
    {
        Console.WriteLine($"[{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}] [MessageBroker] Dispatched Event '{typeof(TEvent).Name}' (EventId: {domainEvent.EventId})");
        return Task.CompletedTask;
    }
}
