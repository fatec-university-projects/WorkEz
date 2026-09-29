using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Events;
using WorkEz.Domain.Interfaces;

namespace WorkEz.Domain.Events
{
    public record ProposalSubmittedEvent(Guid EventId, DateTime OccurredOn, Guid ProposalId, Guid ServiceId, Guid ProviderId, decimal ProposedPrice) : IDomainEvent;
    public record ProposalAcceptedEvent(Guid EventId, DateTime OccurredOn, Guid ProposalId, Guid ServiceId, Guid CustomerId, Guid ProviderId, decimal AgreedPrice, Guid AppointmentId) : IDomainEvent;
    public record ProposalRejectedEvent(Guid EventId, DateTime OccurredOn, Guid ProposalId, Guid ServiceId, Guid CustomerId, string? Reason) : IDomainEvent;
}

namespace WorkEz.Domain.Services
{
    public interface IBaseService<TEntity> where TEntity : BaseEntity
    {
        Task<TEntity?> GetByIdAsync(Guid id);
        Task<IEnumerable<TEntity>> GetAllAsync();
        Task<Result<TEntity>> CreateAsync(TEntity entity);
        Task<Result> UpdateAsync(TEntity entity);
        Task<Result> DeleteAsync(Guid id);
    }

    public abstract class BaseService<TEntity>(IBaseRepository<TEntity> repository) : IBaseService<TEntity> where TEntity : BaseEntity
    {
        protected readonly IBaseRepository<TEntity> Repository = repository;
        public virtual async Task<TEntity?> GetByIdAsync(Guid id) => await Repository.GetByIdAsync(id);
        public virtual async Task<IEnumerable<TEntity>> GetAllAsync() => await Repository.GetAllAsync();
        public virtual async Task<Result<TEntity>> CreateAsync(TEntity entity) { await Repository.AddAsync(entity); await Repository.SaveChangesAsync(); return Result<TEntity>.Success(entity); }
        public virtual async Task<Result> UpdateAsync(TEntity entity) { var existing = await Repository.GetByIdAsync(entity.Id); if (existing is null) return Result.Failure("Entity not found", "NOT_FOUND"); Repository.Update(entity); await Repository.SaveChangesAsync(); return Result.Success(); }
        public virtual async Task<Result> DeleteAsync(Guid id) { var entity = await Repository.GetByIdAsync(id); if (entity is null) return Result.Failure("Entity not found", "NOT_FOUND"); Repository.Remove(entity); await Repository.SaveChangesAsync(); return Result.Success(); }
    }

    public interface IProposalDomainService : IBaseService<Proposal>
    {
        Task<Result<Proposal>> ProposePriceAsync(Guid providerUserId, Guid serviceId, decimal proposedPrice, string? description, string? estimatedTime);
        Task<Result<Proposal>> AcceptProposalAsync(Guid customerUserId, Guid proposalId);
        Task<Result> RejectProposalAsync(Guid customerUserId, Guid proposalId, string? reason);
        Task<IEnumerable<Proposal>> GetProposalsByServiceIdAsync(Guid serviceId);
    }

    public class ProposalDomainService(
        IProposalRepository proposalRepository,
        IServiceRepository serviceRepository,
        IAppointmentRepository appointmentRepository,
        IBaseRepository<ServiceProvider> providerRepository,
        IBaseRepository<Customer> customerRepository,
        IBaseMessageBroker messageBroker
    ) : BaseService<Proposal>(proposalRepository), IProposalDomainService
    {
        private readonly IProposalRepository _proposalRepository = proposalRepository;
        private readonly IServiceRepository _serviceRepository = serviceRepository;
        private readonly IAppointmentRepository _appointmentRepository = appointmentRepository;
        private readonly IBaseRepository<ServiceProvider> _providerRepository = providerRepository;
        private readonly IBaseRepository<Customer> _customerRepository = customerRepository;
        private readonly IBaseMessageBroker _messageBroker = messageBroker;

        public async Task<Result<Proposal>> ProposePriceAsync(Guid providerUserId, Guid serviceId, decimal proposedPrice, string? description, string? estimatedTime)
        {
            var providers = await _providerRepository.FindAsync(p => p.UserId == providerUserId);
            var provider = providers.FirstOrDefault();
            if (provider is null) return Result<Proposal>.Failure("Prestador de serviço não encontrado.", "PROVIDER_NOT_FOUND");

            var service = await _serviceRepository.GetByIdAsync(serviceId);
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

            await _messageBroker.PublishAsync(new ProposalSubmittedEvent(Guid.NewGuid(), DateTime.UtcNow, proposal.Id, service.Id, provider.Id, proposal.ProposedPrice));
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

            var pendingProposals = await _proposalRepository.GetPendingProposalsByServiceIdAsync(service.Id);
            foreach (var pending in pendingProposals)
            {
                if (pending.Id != proposal.Id)
                {
                    pending.ProposalStatus = ProposalStatus.Rejected;
                    _proposalRepository.Update(pending);
                }
            }

            var appointment = new Appointment
            {
                ServiceId = service.Id,
                ProposalId = proposal.Id,
                CustomerId = service.CustomerId,
                ProviderId = proposal.ProviderId,
                AppointmentStatus = AppointmentStatus.Confirmed,
                FinalPrice = proposal.ProposedPrice,
                ScheduledDate = service.DesiredDate ?? DateTime.UtcNow.AddDays(1),
                ConfirmationCode = new Random().Next(1000, 9999).ToString()
            };

            await _appointmentRepository.AddAsync(appointment);
            await _proposalRepository.SaveChangesAsync();

            await _messageBroker.PublishAsync(new ProposalAcceptedEvent(Guid.NewGuid(), DateTime.UtcNow, proposal.Id, service.Id, service.CustomerId, proposal.ProviderId, proposal.ProposedPrice, appointment.Id));
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
            await _messageBroker.PublishAsync(new ProposalRejectedEvent(Guid.NewGuid(), DateTime.UtcNow, proposal.Id, service.Id, service.CustomerId, reason));
            return Result.Success();
        }

        public async Task<IEnumerable<Proposal>> GetProposalsByServiceIdAsync(Guid serviceId)
        {
            return await _proposalRepository.GetProposalsByServiceIdAsync(serviceId);
        }
    }
}
