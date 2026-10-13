using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Events;
using WorkEz.Domain.Interfaces;

namespace WorkEz.Domain.Services;

public interface IProposalDomainService : IBaseService<Proposal>
{
    Task<Result<Proposal>> ProposePriceAsync(Guid providerUserId, Guid serviceId, decimal proposedPrice, string? description, string? estimatedTime);
    Task<Result<Proposal>> AcceptProposalAsync(Guid customerUserId, Guid proposalId);
    Task<Result> RejectProposalAsync(Guid customerUserId, Guid proposalId, string? reason);
    Task<IEnumerable<Proposal>> GetProposalsByServiceIdAsync(Guid serviceId);
}

/// <summary>
/// Core Domain Service managing price proposal negotiations according to Eric Evans' DDD principles.
/// All business invariants, state transitions, fee calculations, and email notification triggers stay in Domain.
/// </summary>
public class ProposalDomainService(
    IProposalRepository proposalRepository,
    IServiceRepository serviceRepository,
    IAppointmentRepository appointmentRepository,
    IBaseRepository<ServiceProvider> providerRepository,
    IBaseRepository<Customer> customerRepository,
    IBaseMessageBroker messageBroker,
    IEmailService emailService
) : BaseService<Proposal>(proposalRepository), IProposalDomainService
{
    private readonly IProposalRepository _proposalRepository = proposalRepository;
    private readonly IServiceRepository _serviceRepository = serviceRepository;
    private readonly IAppointmentRepository _appointmentRepository = appointmentRepository;
    private readonly IBaseRepository<ServiceProvider> _providerRepository = providerRepository;
    private readonly IBaseRepository<Customer> _customerRepository = customerRepository;
    private readonly IBaseMessageBroker _messageBroker = messageBroker;
    private readonly IEmailService _emailService = emailService;

    public async Task<Result<Proposal>> ProposePriceAsync(Guid providerUserId, Guid serviceId, decimal proposedPrice, string? description, string? estimatedTime)
    {
        var providers = await _providerRepository.FindAsync(p => p.UserId == providerUserId);
        var provider = providers.FirstOrDefault();
        if (provider is null) return Result<Proposal>.Failure("Prestador de serviço não encontrado.", "PROVIDER_NOT_FOUND");

        var service = await _serviceRepository.GetByIdWithDetailsAsync(serviceId);
        if (service is null) return Result<Proposal>.Failure("Serviço solicitado não encontrado.", "SERVICE_NOT_FOUND");

        if (service.ServiceStatus != ServiceStatus.Open && service.ServiceStatus != ServiceStatus.UnderNegotiation)
        {
            return Result<Proposal>.Failure($"Não é possível enviar propostas para um serviço com status '{service.ServiceStatus}'.", "INVALID_SERVICE_STATUS");
        }

        var existingProposal = await _proposalRepository.GetExistingProposalAsync(service.Id, provider.Id);
        if (existingProposal != null) return Result<Proposal>.Failure("Você já possui uma proposta pendente para este serviço.", "DUPLICATE_PROPOSAL");

        var proposal = new Proposal
        {
            ServiceId = service.Id,
            ProviderId = provider.Id,
            ProposedPrice = proposedPrice,
            Description = description,
            EstimatedTime = estimatedTime,
            ProposalStatus = ProposalStatus.Pending
        };

        await _proposalRepository.AddAsync(proposal);
        service.ServiceStatus = ServiceStatus.UnderNegotiation;
        _serviceRepository.Update(service);
        await _proposalRepository.SaveChangesAsync();

        // 1. Notifica o barramento de eventos do domínio
        await _messageBroker.PublishAsync(new ProposalSubmittedEvent(Guid.NewGuid(), DateTime.UtcNow, proposal.Id, service.Id, provider.Id, proposal.ProposedPrice));

        // 2. Dispara e-mail de notificação para o cliente do serviço
        var clientEmail = service.Customer?.User?.Email ?? "cliente@workez.com.br";
        var clientName = service.Customer?.User?.Name ?? "Cliente WorkEz";
        var providerName = provider.User?.Name ?? "Prestador de Serviços";

        await _emailService.SendProposalNotificationAsync(
            clientEmail: clientEmail,
            clientName: clientName,
            providerName: providerName,
            serviceTitle: service.Title,
            proposedPrice: proposedPrice,
            description: description
        );

        return Result<Proposal>.Success(proposal);
    }

    public async Task<Result<Proposal>> AcceptProposalAsync(Guid customerUserId, Guid proposalId)
    {
        var proposal = await _proposalRepository.GetByIdWithServiceAndProviderAsync(proposalId);
        if (proposal is null) return Result<Proposal>.Failure("Proposta não encontrada.", "PROPOSAL_NOT_FOUND");
        if (proposal.ProposalStatus != ProposalStatus.Pending) return Result<Proposal>.Failure("Apenas propostas pendentes podem ser aceitas.", "INVALID_PROPOSAL_STATUS");

        var service = proposal.Service;
        if (service is null) return Result<Proposal>.Failure("Serviço associado não foi encontrado.", "SERVICE_NOT_FOUND");

        var customers = await _customerRepository.FindAsync(c => c.Id == service.CustomerId);
        var customer = customers.FirstOrDefault();
        if (customer is null || customer.UserId != customerUserId)
        {
            return Result<Proposal>.Failure("Você não possui permissão para aceitar propostas deste serviço.", "UNAUTHORIZED_CUSTOMER");
        }

        proposal.ProposalStatus = ProposalStatus.Accepted;
        _proposalRepository.Update(proposal);

        service.ServiceStatus = ServiceStatus.Accepted;
        _serviceRepository.Update(service);

        // Rejeita outras propostas pendentes concorrentes
        var pendingProposals = await _proposalRepository.GetPendingProposalsByServiceIdAsync(service.Id);
        foreach (var pending in pendingProposals)
        {
            if (pending.Id != proposal.Id)
            {
                pending.ProposalStatus = ProposalStatus.Rejected;
                _proposalRepository.Update(pending);
            }
        }

        var confirmationCode = new Random().Next(1000, 9999).ToString();
        var appointment = new Appointment
        {
            ServiceId = service.Id,
            ProposalId = proposal.Id,
            CustomerId = service.CustomerId,
            ProviderId = proposal.ProviderId,
            AppointmentStatus = AppointmentStatus.Confirmed,
            FinalPrice = proposal.ProposedPrice,
            ScheduledDate = service.DesiredDate ?? DateTime.UtcNow.AddDays(1),
            ConfirmationCode = confirmationCode
        };

        await _appointmentRepository.AddAsync(appointment);
        await _proposalRepository.SaveChangesAsync();

        // 1. Notifica barramento de eventos
        await _messageBroker.PublishAsync(new ProposalAcceptedEvent(Guid.NewGuid(), DateTime.UtcNow, proposal.Id, service.Id, service.CustomerId, proposal.ProviderId, proposal.ProposedPrice, appointment.Id));

        // 2. Dispara e-mail de notificação de aceite para o prestador
        var providerEmail = proposal.Provider?.User?.Email ?? "prestador@workez.com.br";
        var providerName = proposal.Provider?.User?.Name ?? "Prestador";
        var clientName = customer.User?.Name ?? "Cliente";

        await _emailService.SendProposalAcceptedNotificationAsync(
            providerEmail: providerEmail,
            providerName: providerName,
            clientName: clientName,
            serviceTitle: service.Title,
            agreedPrice: proposal.ProposedPrice,
            confirmationCode: confirmationCode
        );

        return Result<Proposal>.Success(proposal);
    }

    public async Task<Result> RejectProposalAsync(Guid customerUserId, Guid proposalId, string? reason)
    {
        var proposal = await _proposalRepository.GetByIdWithServiceAndProviderAsync(proposalId);
        if (proposal is null) return Result.Failure("Proposta não encontrada.", "PROPOSAL_NOT_FOUND");
        if (proposal.ProposalStatus != ProposalStatus.Pending) return Result.Failure("Apenas propostas pendentes podem ser recusadas.", "INVALID_PROPOSAL_STATUS");

        var service = proposal.Service;
        if (service is null) return Result.Failure("Serviço associado não foi encontrado.", "SERVICE_NOT_FOUND");

        var customers = await _customerRepository.FindAsync(c => c.Id == service.CustomerId);
        var customer = customers.FirstOrDefault();
        if (customer is null || customer.UserId != customerUserId)
        {
            return Result.Failure("Você não possui permissão para recusar propostas deste serviço.", "UNAUTHORIZED_CUSTOMER");
        }

        proposal.ProposalStatus = ProposalStatus.Rejected;
        _proposalRepository.Update(proposal);

        var remainingPending = (await _proposalRepository.GetPendingProposalsByServiceIdAsync(service.Id)).Where(p => p.Id != proposal.Id);
        if (!remainingPending.Any())
        {
            service.ServiceStatus = ServiceStatus.Open;
            _serviceRepository.Update(service);
        }

        await _proposalRepository.SaveChangesAsync();

        // 1. Evento de Domínio
        await _messageBroker.PublishAsync(new ProposalRejectedEvent(Guid.NewGuid(), DateTime.UtcNow, proposal.Id, service.Id, service.CustomerId, reason));

        // 2. E-mail de notificação para o prestador
        var providerEmail = proposal.Provider?.User?.Email ?? "prestador@workez.com.br";
        var providerName = proposal.Provider?.User?.Name ?? "Prestador";

        await _emailService.SendProposalRejectedNotificationAsync(
            providerEmail: providerEmail,
            providerName: providerName,
            serviceTitle: service.Title,
            reason: reason
        );

        return Result.Success();
    }

    public async Task<IEnumerable<Proposal>> GetProposalsByServiceIdAsync(Guid serviceId)
    {
        return await _proposalRepository.GetProposalsByServiceIdAsync(serviceId);
    }
}
