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
    public record ServiceCreatedEvent(Guid EventId, DateTime OccurredOn, Guid ServiceId, Guid CustomerId, string Title, double? Latitude, double? Longitude, Guid CategoryId) : IDomainEvent;
    public record ProviderDisplacementStartedEvent(Guid EventId, DateTime OccurredOn, Guid ServiceId, Guid CustomerId, Guid ProviderId) : IDomainEvent;
    public record ChatMessageSentEvent(Guid EventId, DateTime OccurredOn, Guid MessageId, Guid? ProposalId, Guid? ServiceId, Guid SenderId, string Content, bool IsFromProvider) : IDomainEvent;
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
        Task<Result<Proposal>> ProposePriceAsync(Guid providerUserId, Guid serviceId, decimal proposedPrice, string? description, string? estimatedTime, decimal? laborPrice = null, decimal? materialsPrice = null);
        Task<Result<Proposal>> AcceptProposalAsync(Guid customerUserId, Guid proposalId);
        Task<Result> RejectProposalAsync(Guid customerUserId, Guid proposalId, string? reason);
        Task<IEnumerable<Proposal>> GetProposalsByServiceIdAsync(Guid serviceId);
        Task<IEnumerable<Proposal>> GetProposalsByProviderUserIdAsync(Guid providerUserId);

        // ── Negociação ─────────────────────────────────────────────────────
        Task<Result<Proposal>> CounterProposalAsync(Guid customerUserId, Guid proposalId, decimal counterPrice, string? counterDescription);
        Task<Result<Proposal>> AcceptCounterAsync(Guid providerUserId, Guid proposalId);
        Task<Result<Proposal>> RejectCounterAsync(Guid providerUserId, Guid proposalId);
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

        public override async Task<Proposal?> GetByIdAsync(Guid id) =>
            await _proposalRepository.GetByIdWithServiceAndProviderAsync(id);

        public async Task<IEnumerable<Proposal>> GetProposalsByProviderUserIdAsync(Guid providerUserId) =>
            await _proposalRepository.GetProposalsByProviderUserIdAsync(providerUserId);

        public async Task<Result<Proposal>> ProposePriceAsync(
            Guid providerUserId, 
            Guid serviceId, 
            decimal proposedPrice, 
            string? description, 
            string? estimatedTime,
            decimal? laborPrice = null,
            decimal? materialsPrice = null)
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

            var (finalLabor, finalMaterials, totalProposed) = CalculateProposalPrices(proposedPrice, laborPrice, materialsPrice);

            var existingProposal = await _proposalRepository.GetExistingProposalAsync(service.Id, provider.Id);
            if (existingProposal != null)
            {
                existingProposal.ProposedPrice = totalProposed;
                existingProposal.LaborPrice = finalLabor;
                existingProposal.MaterialsPrice = finalMaterials;
                existingProposal.Description = description;
                existingProposal.EstimatedTime = estimatedTime;
                existingProposal.Touch();
                _proposalRepository.Update(existingProposal);
                await _proposalRepository.SaveChangesAsync();

                await _messageBroker.PublishAsync(new ProposalSubmittedEvent(Guid.NewGuid(), DateTime.UtcNow, existingProposal.Id, service.Id, provider.Id, existingProposal.ProposedPrice));
                return Result<Proposal>.Success(existingProposal);
            }

            var proposal = new Proposal
            {
                ServiceId = service.Id,
                ProviderId = provider.Id,
                ProposedPrice = totalProposed,
                LaborPrice = finalLabor,
                MaterialsPrice = finalMaterials,
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
            if (proposal.ProposalStatus != ProposalStatus.Pending && proposal.ProposalStatus != ProposalStatus.NegotiationOpen)
                return Result<Proposal>.Failure("Apenas propostas pendentes ou em negociação podem ser aceitas.", "INVALID_PROPOSAL_STATUS");

            var service = proposal.Service;
            if (service is null) return Result<Proposal>.Failure("Serviço associado não foi encontrado.", "SERVICE_NOT_FOUND");
            if (service.ServiceStatus == ServiceStatus.Accepted || service.ServiceStatus == ServiceStatus.Completed || service.ServiceStatus == ServiceStatus.Cancelled)
                return Result<Proposal>.Failure($"O serviço já se encontra com status '{service.ServiceStatus}' e não pode mais aceitar propostas.", "INVALID_SERVICE_STATUS");

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

            await RejectOtherPendingProposalsAsync(service.Id, proposal.Id);
            var appointment = await CreateAppointmentAsync(service, proposal, proposal.ProposedPrice);
            await _proposalRepository.SaveChangesAsync();

            await _messageBroker.PublishAsync(new ProposalAcceptedEvent(Guid.NewGuid(), DateTime.UtcNow, proposal.Id, service.Id, service.CustomerId, proposal.ProviderId, proposal.ProposedPrice, appointment.Id));
            return Result<Proposal>.Success(proposal);
        }

        public async Task<Result> RejectProposalAsync(Guid customerUserId, Guid proposalId, string? reason)
        {
            var proposal = await _proposalRepository.GetByIdWithServiceAndProviderAsync(proposalId);
            if (proposal is null) return Result.Failure("Proposta não encontrada.", "PROPOSAL_NOT_FOUND");
            if (proposal.ProposalStatus != ProposalStatus.Pending && proposal.ProposalStatus != ProposalStatus.NegotiationOpen && proposal.ProposalStatus != ProposalStatus.CounterOffered)
                return Result.Failure("Apenas propostas ativas podem ser recusadas.", "INVALID_PROPOSAL_STATUS");

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

        // ── Negociação ───────────────────────────────────────────────────────────────

        public async Task<Result<Proposal>> CounterProposalAsync(Guid customerUserId, Guid proposalId, decimal counterPrice, string? counterDescription)
        {
            var proposal = await _proposalRepository.GetByIdWithServiceAndProviderAsync(proposalId);
            if (proposal is null) return Result<Proposal>.Failure("Proposta não encontrada.", "PROPOSAL_NOT_FOUND");

            if (proposal.ProposalStatus != ProposalStatus.Pending && proposal.ProposalStatus != ProposalStatus.NegotiationOpen)
                return Result<Proposal>.Failure("Contra-proposta só pode ser feita em propostas pendentes ou em negociação.", "INVALID_PROPOSAL_STATUS");

            var service = proposal.Service;
            if (service is null) return Result<Proposal>.Failure("Serviço não encontrado.", "SERVICE_NOT_FOUND");

            var customers = await _customerRepository.FindAsync(c => c.Id == service.CustomerId);
            if (!customers.Any(c => c.UserId == customerUserId))
                return Result<Proposal>.Failure("Você não tem permissão para fazer contra-proposta neste serviço.", "UNAUTHORIZED_CUSTOMER");

            proposal.CounterPrice = counterPrice;
            proposal.CounterDescription = counterDescription;
            proposal.CounterOfferedAt = DateTime.UtcNow;
            proposal.ProposalStatus = ProposalStatus.CounterOffered;
            _proposalRepository.Update(proposal);
            await _proposalRepository.SaveChangesAsync();

            return Result<Proposal>.Success(proposal);
        }

        public async Task<Result<Proposal>> AcceptCounterAsync(Guid providerUserId, Guid proposalId)
        {
            var proposal = await _proposalRepository.GetByIdWithServiceAndProviderAsync(proposalId);
            if (proposal is null) return Result<Proposal>.Failure("Proposta não encontrada.", "PROPOSAL_NOT_FOUND");

            if (proposal.ProposalStatus != ProposalStatus.CounterOffered)
                return Result<Proposal>.Failure("Apenas propostas com contra-oferta podem ser aceitas pelo prestador.", "INVALID_PROPOSAL_STATUS");

            if (proposal.Provider?.UserId != providerUserId)
                return Result<Proposal>.Failure("Você não tem permissão para aceitar esta contra-proposta.", "UNAUTHORIZED_PROVIDER");

            // Aceita com o valor da contra-proposta
            var finalPrice = proposal.CounterPrice ?? proposal.ProposedPrice;
            proposal.ProposedPrice = finalPrice;
            proposal.ProposalStatus = ProposalStatus.Accepted;
            _proposalRepository.Update(proposal);

            var service = proposal.Service!;
            service.ServiceStatus = ServiceStatus.Accepted;
            _serviceRepository.Update(service);

            await RejectOtherPendingProposalsAsync(service.Id, proposal.Id);
            await CreateAppointmentAsync(service, proposal, finalPrice);
            await _proposalRepository.SaveChangesAsync();

            return Result<Proposal>.Success(proposal);
        }

        public async Task<Result<Proposal>> RejectCounterAsync(Guid providerUserId, Guid proposalId)
        {
            var proposal = await _proposalRepository.GetByIdWithServiceAndProviderAsync(proposalId);
            if (proposal is null) return Result<Proposal>.Failure("Proposta não encontrada.", "PROPOSAL_NOT_FOUND");

            if (proposal.ProposalStatus != ProposalStatus.CounterOffered)
                return Result<Proposal>.Failure("Apenas propostas com contra-oferta podem ser recusadas pelo prestador.", "INVALID_PROPOSAL_STATUS");

            if (proposal.Provider?.UserId != providerUserId)
                return Result<Proposal>.Failure("Você não tem permissão para recusar esta contra-proposta.", "UNAUTHORIZED_PROVIDER");

            // Volta para Pending para o cliente poder aceitar o valor original
            proposal.ProposalStatus = ProposalStatus.Pending;
            proposal.CounterPrice = null;
            proposal.CounterDescription = null;
            proposal.CounterOfferedAt = null;
            _proposalRepository.Update(proposal);
            await _proposalRepository.SaveChangesAsync();

            return Result<Proposal>.Success(proposal);
        }

        private static (decimal Labor, decimal Materials, decimal Total) CalculateProposalPrices(
            decimal proposedPrice,
            decimal? laborPrice,
            decimal? materialsPrice)
        {
            decimal finalLabor = laborPrice ?? (proposedPrice - (materialsPrice ?? 0m));
            if (finalLabor < 0) finalLabor = proposedPrice;
            decimal finalMaterials = materialsPrice ?? 0m;
            decimal totalProposed = finalLabor + finalMaterials;
            if (totalProposed <= 0) totalProposed = proposedPrice;
            return (finalLabor, finalMaterials, totalProposed);
        }

        private async Task RejectOtherPendingProposalsAsync(Guid serviceId, Guid acceptedProposalId)
        {
            var pendingProposals = await _proposalRepository.GetPendingProposalsByServiceIdAsync(serviceId);
            foreach (var pending in pendingProposals)
            {
                if (pending.Id != acceptedProposalId)
                {
                    pending.ProposalStatus = ProposalStatus.Rejected;
                    _proposalRepository.Update(pending);
                }
            }
        }

        private async Task<Appointment> CreateAppointmentAsync(Service service, Proposal proposal, decimal finalPrice)
        {
            var appointment = new Appointment
            {
                ServiceId = service.Id,
                ProposalId = proposal.Id,
                CustomerId = service.CustomerId,
                ProviderId = proposal.ProviderId,
                AppointmentStatus = AppointmentStatus.Confirmed,
                FinalPrice = finalPrice,
                ScheduledDate = service.DesiredDate ?? DateTime.UtcNow.AddDays(1),
                ConfirmationCode = new Random().Next(1000, 9999).ToString()
            };

            await _appointmentRepository.AddAsync(appointment);
            return appointment;
        }
    }
}
