using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Events;
using WorkEz.Domain.Interfaces;

namespace WorkEz.Domain.Services;

public interface IServiceDomainService : IBaseService<Service>
{
    Task<Result<Service>> UpdateServiceStatusAsync(Guid serviceId, ServiceStatus newStatus, string? observations = null);
    Task<Result<Service>> ProviderAcceptServiceAsync(Guid providerUserId, Guid serviceId, decimal agreedPrice, DateTime? scheduledDate);
    Task<Service?> GetByIdWithDetailsAsync(Guid serviceId);
    Task<IEnumerable<Service>> GetServicesByCustomerAsync(Guid customerId);
}

public class ServiceDomainService(
    IServiceRepository serviceRepository,
    IBaseRepository<ServiceProvider> providerRepository,
    IAppointmentRepository appointmentRepository,
    IBaseMessageBroker messageBroker,
    IEmailService emailService
) : BaseService<Service>(serviceRepository), IServiceDomainService
{
    private readonly IServiceRepository _serviceRepository = serviceRepository;
    private readonly IBaseRepository<ServiceProvider> _providerRepository = providerRepository;
    private readonly IAppointmentRepository _appointmentRepository = appointmentRepository;
    private readonly IBaseMessageBroker _messageBroker = messageBroker;
    private readonly IEmailService _emailService = emailService;

    public async Task<Service?> GetByIdWithDetailsAsync(Guid serviceId)
    {
        return await _serviceRepository.GetByIdWithDetailsAsync(serviceId);
    }

    public async Task<IEnumerable<Service>> GetServicesByCustomerAsync(Guid customerId)
    {
        return await _serviceRepository.GetServicesByCustomerAsync(customerId);
    }

    public async Task<Result<Service>> UpdateServiceStatusAsync(Guid serviceId, ServiceStatus newStatus, string? observations = null)
    {
        var service = await _serviceRepository.GetByIdWithDetailsAsync(serviceId);
        if (service is null)
        {
            return Result<Service>.Failure("Serviço não encontrado.", "SERVICE_NOT_FOUND");
        }

        var oldStatus = service.ServiceStatus.ToString();
        service.ServiceStatus = newStatus;
        service.Touch();

        _serviceRepository.Update(service);
        await _serviceRepository.SaveChangesAsync();

        // 1. Publica Evento de Domínio
        await _messageBroker.PublishAsync(new OrderStatusUpdatedEvent(
            EventId: Guid.NewGuid(),
            OccurredOn: DateTime.UtcNow,
            ServiceId: service.Id,
            OldStatus: oldStatus,
            NewStatus: newStatus.ToString(),
            Observations: observations
        ));

        // 2. Dispara e-mail de notificação para o cliente
        var clientEmail = service.Customer?.User?.Email ?? "cliente@workez.com.br";
        var clientName = service.Customer?.User?.Name ?? "Cliente WorkEz";

        await _emailService.SendOrderStatusUpdatedNotificationAsync(
            recipientEmail: clientEmail,
            recipientName: clientName,
            serviceTitle: service.Title,
            oldStatus: oldStatus,
            newStatus: newStatus.ToString(),
            observations: observations
        );

        // Se houver prestador alocado (Appointment), notifica o prestador também
        if (service.Appointment?.Provider?.User != null)
        {
            var providerEmail = service.Appointment.Provider.User.Email;
            var providerName = service.Appointment.Provider.User.Name;

            await _emailService.SendOrderStatusUpdatedNotificationAsync(
                recipientEmail: providerEmail,
                recipientName: providerName,
                serviceTitle: service.Title,
                oldStatus: oldStatus,
                newStatus: newStatus.ToString(),
                observations: observations
            );
        }

        return Result<Service>.Success(service);
    }

    public async Task<Result<Service>> ProviderAcceptServiceAsync(Guid providerUserId, Guid serviceId, decimal agreedPrice, DateTime? scheduledDate)
    {
        var providers = await _providerRepository.FindAsync(p => p.UserId == providerUserId);
        var provider = providers.FirstOrDefault();
        if (provider is null)
        {
            return Result<Service>.Failure("Prestador de serviço não encontrado.", "PROVIDER_NOT_FOUND");
        }

        var service = await _serviceRepository.GetByIdWithDetailsAsync(serviceId);
        if (service is null)
        {
            return Result<Service>.Failure("Serviço não encontrado.", "SERVICE_NOT_FOUND");
        }

        service.ServiceStatus = ServiceStatus.Accepted;
        service.Touch();
        _serviceRepository.Update(service);

        var confirmationCode = new Random().Next(1000, 9999).ToString();
        var appointment = new Appointment
        {
            ServiceId = service.Id,
            CustomerId = service.CustomerId,
            ProviderId = provider.Id,
            AppointmentStatus = AppointmentStatus.Confirmed,
            FinalPrice = agreedPrice,
            ScheduledDate = scheduledDate ?? DateTime.UtcNow.AddDays(1),
            ConfirmationCode = confirmationCode
        };

        await _appointmentRepository.AddAsync(appointment);
        await _serviceRepository.SaveChangesAsync();

        // 1. Publica Evento de Domínio
        await _messageBroker.PublishAsync(new ProviderAcceptedServiceEvent(
            EventId: Guid.NewGuid(),
            OccurredOn: DateTime.UtcNow,
            ServiceId: service.Id,
            ProviderId: provider.Id,
            AgreedPrice: agreedPrice,
            ScheduledDate: scheduledDate
        ));

        // 2. Dispara e-mail para o cliente avisando do aceite
        var clientEmail = service.Customer?.User?.Email ?? "cliente@workez.com.br";
        var clientName = service.Customer?.User?.Name ?? "Cliente WorkEz";
        var providerName = provider.User?.Name ?? "Prestador de Serviço";

        await _emailService.SendProviderAcceptedNotificationAsync(
            clientEmail: clientEmail,
            clientName: clientName,
            providerName: providerName,
            serviceTitle: service.Title,
            agreedPrice: agreedPrice,
            scheduledDate: scheduledDate
        );

        return Result<Service>.Success(service);
    }
}
