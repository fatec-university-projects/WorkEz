using System.Linq.Expressions;
using Xunit;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Interfaces;
using WorkEz.Domain.Services;
using WorkEz.Infra.Data.MessageBroker;
using ServiceProviderEntity = WorkEz.Domain.Entities.ServiceProvider;

namespace WorkEz.WebUID.Tests;

public class ProposalApplicationServiceTests
{
    private readonly FakeProposalRepository _proposalRepository = new();
    private readonly FakeServiceRepository _serviceRepository = new();
    private readonly FakeAppointmentRepository _appointmentRepository = new();
    private readonly FakeProviderRepository _providerRepository = new();
    private readonly FakeCustomerRepository _customerRepository = new();
    private readonly FakeChatMessageRepository _chatMessageRepository = new();
    private readonly BaseMessageBroker _messageBroker = new();

    private ProposalApplicationService CreateService()
    {
        var domainService = new ProposalDomainService(
            _proposalRepository, _serviceRepository, _appointmentRepository,
            _providerRepository, _customerRepository, _messageBroker);
        return new ProposalApplicationService(domainService, _chatMessageRepository);
    }

    [Fact]
    public async Task SendChatMessageAsync_AcceptedProposalWithActiveService_ChatShouldPersistAndSucceed()
    {
        var service = new Service
        {
            Id = Guid.NewGuid(),
            Title = "Conserto Elétrico",
            ServiceStatus = ServiceStatus.InProgress
        };
        var proposal = new Proposal
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            Service = service,
            ProposedPrice = 180m,
            ProposalStatus = ProposalStatus.Accepted
        };

        await _serviceRepository.AddAsync(service);
        await _proposalRepository.AddAsync(proposal);

        var appService = CreateService();
        var request = new SendChatMessageRequest(proposal.Id, Guid.NewGuid(), "Estou aguardando você no local!", false);

        var result = await appService.SendChatMessageAsync(request);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal("Estou aguardando você no local!", result.Value.Content);
        Assert.Single(_chatMessageRepository.Messages);
    }

    [Fact]
    public async Task SendChatMessageAsync_AcceptedProposalWithCompletedService_ShouldFail()
    {
        var service = new Service
        {
            Id = Guid.NewGuid(),
            Title = "Pintura",
            ServiceStatus = ServiceStatus.Completed
        };
        var proposal = new Proposal
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            Service = service,
            ProposedPrice = 250m,
            ProposalStatus = ProposalStatus.Accepted
        };

        await _serviceRepository.AddAsync(service);
        await _proposalRepository.AddAsync(proposal);

        var appService = CreateService();
        var request = new SendChatMessageRequest(proposal.Id, Guid.NewGuid(), "Obrigado pelo serviço!", false);

        var result = await appService.SendChatMessageAsync(request);

        Assert.True(result.IsFailure);
        Assert.Equal("SERVICE_FINISHED", result.ErrorCode);
    }

    [Fact]
    public async Task GetActiveChatProposalByServiceIdAsync_WithAcceptedProposal_ReturnsAccepted()
    {
        var serviceId = Guid.NewGuid();
        var acceptedProposal = new Proposal
        {
            Id = Guid.NewGuid(),
            ServiceId = serviceId,
            ProposedPrice = 150m,
            ProposalStatus = ProposalStatus.Accepted
        };

        await _proposalRepository.AddAsync(acceptedProposal);

        var appService = CreateService();
        var result = await appService.GetActiveChatProposalByServiceIdAsync(serviceId);

        Assert.NotNull(result);
        Assert.Equal(acceptedProposal.Id, result.Id);
    }

    [Fact]
    public async Task GetActiveChatProposalByServiceIdAsync_NoProposals_ReturnsNull()
    {
        var serviceId = Guid.NewGuid();
        var appService = CreateService();
        var result = await appService.GetActiveChatProposalByServiceIdAsync(serviceId);

        Assert.Null(result);
    }

    // ── Fakes ────────────────────────────────────────────────────────────────

    private class FakeChatMessageRepository : IChatMessageRepository
    {
        public List<ChatMessage> Messages { get; } = [];

        public Task<ChatMessage> SendMessageAsync(Guid proposalId, Guid senderId, string content, bool isFromProvider)
            => SendMessageAsync(proposalId, null, senderId, content, isFromProvider);

        public Task<ChatMessage> SendMessageAsync(Guid? proposalId, Guid? serviceId, Guid senderId, string content, bool isFromProvider)
        {
            var msg = new ChatMessage
            {
                Id = Guid.NewGuid(),
                ProposalId = proposalId,
                ServiceId = serviceId,
                SenderId = senderId,
                Content = content,
                IsFromProvider = isFromProvider,
                SentAt = DateTime.UtcNow
            };
            Messages.Add(msg);
            return Task.FromResult(msg);
        }

        public Task<IEnumerable<ChatMessage>> GetByProposalIdAsync(Guid proposalId)
            => Task.FromResult(Messages.Where(m => m.ProposalId == proposalId));

        public Task<IEnumerable<ChatMessage>> GetByServiceIdAsync(Guid serviceId)
            => Task.FromResult(Messages.Where(m => m.ServiceId == serviceId));

        public Task<ChatMessage?> GetByIdAsync(Guid id) => Task.FromResult(Messages.FirstOrDefault(m => m.Id == id));
        public Task<IEnumerable<ChatMessage>> GetAllAsync() => Task.FromResult<IEnumerable<ChatMessage>>(Messages);
        public Task<IEnumerable<ChatMessage>> FindAsync(Expression<Func<ChatMessage, bool>> predicate)
            => Task.FromResult(Messages.AsQueryable().Where(predicate).AsEnumerable());
        public Task AddAsync(ChatMessage entity) { Messages.Add(entity); return Task.CompletedTask; }
        public void Update(ChatMessage entity) { }
        public void Remove(ChatMessage entity) => Messages.Remove(entity);
        public Task<int> SaveChangesAsync() => Task.FromResult(1);
    }

    private class FakeProposalRepository : IProposalRepository
    {
        public List<Proposal> Proposals { get; } = [];
        public Task<Proposal?> GetByIdAsync(Guid id) => Task.FromResult(Proposals.FirstOrDefault(p => p.Id == id));
        public Task<IEnumerable<Proposal>> GetAllAsync() => Task.FromResult<IEnumerable<Proposal>>(Proposals);
        public Task<IEnumerable<Proposal>> FindAsync(Expression<Func<Proposal, bool>> predicate) => Task.FromResult(Proposals.AsQueryable().Where(predicate).AsEnumerable());
        public Task AddAsync(Proposal entity) { Proposals.Add(entity); return Task.CompletedTask; }
        public void Update(Proposal entity) { }
        public void Remove(Proposal entity) => Proposals.Remove(entity);
        public Task<int> SaveChangesAsync() => Task.FromResult(1);
        public Task<Proposal?> GetByIdWithServiceAndProviderAsync(Guid id) => Task.FromResult(Proposals.FirstOrDefault(p => p.Id == id));
        public Task<IEnumerable<Proposal>> GetProposalsByServiceIdAsync(Guid serviceId) => Task.FromResult(Proposals.Where(p => p.ServiceId == serviceId));
        public Task<IEnumerable<Proposal>> GetPendingProposalsByServiceIdAsync(Guid serviceId) => Task.FromResult(Proposals.Where(p => p.ServiceId == serviceId && p.ProposalStatus == ProposalStatus.Pending));
        public Task<Proposal?> GetExistingProposalAsync(Guid serviceId, Guid providerId) => Task.FromResult(Proposals.FirstOrDefault(p => p.ServiceId == serviceId && p.ProviderId == providerId && p.ProposalStatus == ProposalStatus.Pending));
        public Task<IEnumerable<Proposal>> GetProposalsByProviderUserIdAsync(Guid providerUserId) => Task.FromResult(Proposals.Where(p => p.Provider?.UserId == providerUserId));
    }

    private class FakeServiceRepository : IServiceRepository
    {
        public List<Service> Services { get; } = [];
        public Task<Service?> GetByIdAsync(Guid id) => Task.FromResult(Services.FirstOrDefault(s => s.Id == id));
        public Task<IEnumerable<Service>> GetAllAsync() => Task.FromResult<IEnumerable<Service>>(Services);
        public Task<IEnumerable<Service>> FindAsync(Expression<Func<Service, bool>> predicate) => Task.FromResult(Services.AsQueryable().Where(predicate).AsEnumerable());
        public Task AddAsync(Service entity) { Services.Add(entity); return Task.CompletedTask; }
        public void Update(Service entity) { }
        public void Remove(Service entity) => Services.Remove(entity);
        public Task<int> SaveChangesAsync() => Task.FromResult(1);
        public Task<Service?> GetByIdWithDetailsAsync(Guid id) => GetByIdAsync(id);
        public Task<IEnumerable<Service>> GetServicesByCustomerAsync(Guid customerId) => Task.FromResult(Services.Where(s => s.CustomerId == customerId));
    }

    private class FakeAppointmentRepository : IAppointmentRepository
    {
        public List<Appointment> Appointments { get; } = [];
        public Task<Appointment?> GetByIdAsync(Guid id) => Task.FromResult(Appointments.FirstOrDefault(a => a.Id == id));
        public Task<IEnumerable<Appointment>> GetAllAsync() => Task.FromResult<IEnumerable<Appointment>>(Appointments);
        public Task<IEnumerable<Appointment>> FindAsync(Expression<Func<Appointment, bool>> predicate) => Task.FromResult(Appointments.AsQueryable().Where(predicate).AsEnumerable());
        public Task AddAsync(Appointment entity) { Appointments.Add(entity); return Task.CompletedTask; }
        public void Update(Appointment entity) { }
        public void Remove(Appointment entity) => Appointments.Remove(entity);
        public Task<int> SaveChangesAsync() => Task.FromResult(1);
        public Task<Appointment?> GetByServiceIdAsync(Guid serviceId) => Task.FromResult(Appointments.FirstOrDefault(a => a.ServiceId == serviceId));
    }

    private class FakeProviderRepository : IBaseRepository<ServiceProviderEntity>
    {
        public List<ServiceProviderEntity> Providers { get; } = [];
        public Task<ServiceProviderEntity?> GetByIdAsync(Guid id) => Task.FromResult(Providers.FirstOrDefault(p => p.Id == id));
        public Task<IEnumerable<ServiceProviderEntity>> GetAllAsync() => Task.FromResult<IEnumerable<ServiceProviderEntity>>(Providers);
        public Task<IEnumerable<ServiceProviderEntity>> FindAsync(Expression<Func<ServiceProviderEntity, bool>> predicate) => Task.FromResult(Providers.AsQueryable().Where(predicate).AsEnumerable());
        public Task AddAsync(ServiceProviderEntity entity) { Providers.Add(entity); return Task.CompletedTask; }
        public void Update(ServiceProviderEntity entity) { }
        public void Remove(ServiceProviderEntity entity) => Providers.Remove(entity);
        public Task<int> SaveChangesAsync() => Task.FromResult(1);
    }

    private class FakeCustomerRepository : IBaseRepository<Customer>
    {
        public List<Customer> Customers { get; } = [];
        public Task<Customer?> GetByIdAsync(Guid id) => Task.FromResult(Customers.FirstOrDefault(c => c.Id == id));
        public Task<IEnumerable<Customer>> GetAllAsync() => Task.FromResult<IEnumerable<Customer>>(Customers);
        public Task<IEnumerable<Customer>> FindAsync(Expression<Func<Customer, bool>> predicate) => Task.FromResult(Customers.AsQueryable().Where(predicate).AsEnumerable());
        public Task AddAsync(Customer entity) { Customers.Add(entity); return Task.CompletedTask; }
        public void Update(Customer entity) { }
        public void Remove(Customer entity) => Customers.Remove(entity);
        public Task<int> SaveChangesAsync() => Task.FromResult(1);
    }
}
