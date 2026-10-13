using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Events;
using WorkEz.Domain.Interfaces;

namespace WorkEz.Domain.Services;

public interface IPaymentDomainService
{
    Task<Result> ProcessPaymentCompletedAsync(Guid serviceId, decimal amount, string paymentMethod, string transactionId);
}

public class PaymentDomainService(
    IServiceRepository serviceRepository,
    IBaseMessageBroker messageBroker,
    IEmailService emailService
) : IPaymentDomainService
{
    private readonly IServiceRepository _serviceRepository = serviceRepository;
    private readonly IBaseMessageBroker _messageBroker = messageBroker;
    private readonly IEmailService _emailService = emailService;

    public async Task<Result> ProcessPaymentCompletedAsync(Guid serviceId, decimal amount, string paymentMethod, string transactionId)
    {
        var service = await _serviceRepository.GetByIdWithDetailsAsync(serviceId);
        if (service is null)
        {
            return Result.Failure("Serviço não encontrado para este pagamento.", "SERVICE_NOT_FOUND");
        }

        // Atualiza status do serviço para Em Andamento
        service.ServiceStatus = ServiceStatus.InProgress;
        service.Touch();
        _serviceRepository.Update(service);
        await _serviceRepository.SaveChangesAsync();

        // 1. Publica Evento de Domínio
        await _messageBroker.PublishAsync(new PaymentCompletedEvent(
            EventId: Guid.NewGuid(),
            OccurredOn: DateTime.UtcNow,
            ServiceId: service.Id,
            CustomerId: service.CustomerId,
            Amount: amount,
            PaymentMethod: paymentMethod,
            TransactionId: transactionId
        ));

        // 2. Dispara e-mail de confirmação para o Cliente
        var clientEmail = service.Customer?.User?.Email ?? "cliente@workez.com.br";
        var clientName = service.Customer?.User?.Name ?? "Cliente";

        await _emailService.SendPaymentCompletedNotificationAsync(
            recipientEmail: clientEmail,
            recipientName: clientName,
            serviceTitle: service.Title,
            amount: amount,
            paymentMethod: paymentMethod,
            transactionId: transactionId
        );

        // 3. Dispara e-mail para o Prestador (se houver agendamento/proposta aceita)
        if (service.Appointment?.Provider?.User != null)
        {
            var providerEmail = service.Appointment.Provider.User.Email;
            var providerName = service.Appointment.Provider.User.Name;

            await _emailService.SendPaymentCompletedNotificationAsync(
                recipientEmail: providerEmail,
                recipientName: providerName,
                serviceTitle: service.Title,
                amount: amount,
                paymentMethod: paymentMethod,
                transactionId: transactionId
            );
        }

        return Result.Success();
    }
}
