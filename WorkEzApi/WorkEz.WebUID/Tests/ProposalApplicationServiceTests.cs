using System.Linq.Expressions;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Interfaces;
using WorkEz.Domain.Services;
using WorkEz.Infra.Data.MessageBroker;
using WorkEz.WebUID.Controllers;
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
    private readonly FakeTrackingNotification _trackingNotification = new();
    private readonly FakeChatNotification _chatNotification = new();
    private readonly FakeWalletService _walletService = new();
    private readonly BaseMessageBroker _messageBroker = new();

    private ProposalApplicationService CreateService()
    {
        var domainService = new ProposalDomainService(
            _proposalRepository, _serviceRepository, _appointmentRepository,
            _providerRepository, _customerRepository, _messageBroker);
        return new ProposalApplicationService(
            domainService,
            _chatMessageRepository,
            _serviceRepository,
            _appointmentRepository,
            _providerRepository,
            _customerRepository,
            _trackingNotification,
            _chatNotification,
            null,
            _walletService);
    }

    private ProposalsController CreateController(Guid? authenticatedUserId = null, string role = "Customer")
    {
        var controller = new ProposalsController(CreateService());
        if (authenticatedUserId.HasValue)
        {
            var identity = new ClaimsIdentity(
                [new Claim("sub", authenticatedUserId.Value.ToString()), new Claim(ClaimTypes.Role, role), new Claim("role", role)],
                "TestAuth");
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
            };
        }
        else
        {
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            };
        }
        return controller;
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

    [Fact]
    public async Task ProposePriceAsync_WithLaborAndMaterials_PlatformFeeShouldApplyOnlyToLabor()
    {
        var providerUser = new User { Id = Guid.NewGuid(), Name = "Eletricista Pro" };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = providerUser.Id, User = providerUser };
        await _providerRepository.AddAsync(provider);

        var service = new Service
        {
            Id = Guid.NewGuid(),
            Title = "Troca de Fiação",
            ServiceStatus = ServiceStatus.Open
        };
        await _serviceRepository.AddAsync(service);

        var appService = CreateService();
        var request = new ProposePriceRequest(
            ProviderUserId: providerUser.Id,
            ServiceId: service.Id,
            ProposedPrice: 300m,
            Description: "Serviço completo com cabos inclusos",
            EstimatedTime: "3 horas",
            LaborPrice: 200m,
            MaterialsPrice: 100m
        );

        var result = await appService.ProposePriceAsync(request);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(300m, result.Value.ProposedPrice);
        Assert.Equal(200m, result.Value.LaborPrice);
        Assert.Equal(100m, result.Value.MaterialsPrice);
        // Taxa de 15% deve incidir apenas sobre os 200m de mão de obra = 30m (e não sobre os 300m = 45m)
        Assert.Equal(30m, result.Value.EstimatedPlatformFee);
        // Ganho líquido: 300m - 30m = 270m
        Assert.Equal(270m, result.Value.NetProviderEarnings);
    }

    [Fact]
    public async Task ProposePriceAsync_NonProviderUser_ShouldReturnForbidden()
    {
        var customerOnlyUserId = Guid.NewGuid();
        var service = new Service { Id = Guid.NewGuid(), Title = "Jardinagem", ServiceStatus = ServiceStatus.Open };
        await _serviceRepository.AddAsync(service);

        var appService = CreateService();
        var request = new ProposePriceRequest(customerOnlyUserId, service.Id, 150m, "Oferta", "2h");

        var result = await appService.ProposePriceAsync(request, customerOnlyUserId, isAdmin: false);

        Assert.True(result.IsFailure);
        Assert.Equal("FORBIDDEN", result.ErrorCode);
    }

    [Fact]
    public async Task GetProposalsByServiceIdAsync_VisibilityIsolation_CustomerSeesAll_ProviderSeesOwn_StrangerGetsForbidden()
    {
        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente Dono" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };
        var service = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, Customer = customer, ServiceStatus = ServiceStatus.UnderNegotiation };

        var provUser1 = new User { Id = Guid.NewGuid(), Name = "Prestador 1" };
        var prov1 = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = provUser1.Id, User = provUser1 };
        var provUser2 = new User { Id = Guid.NewGuid(), Name = "Prestador 2" };
        var prov2 = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = provUser2.Id, User = provUser2 };

        var prop1 = new Proposal { Id = Guid.NewGuid(), ServiceId = service.Id, ProviderId = prov1.Id, Provider = prov1, ProposedPrice = 200m, ProposalStatus = ProposalStatus.Pending };
        var prop2 = new Proposal { Id = Guid.NewGuid(), ServiceId = service.Id, ProviderId = prov2.Id, Provider = prov2, ProposedPrice = 180m, ProposalStatus = ProposalStatus.Pending };

        await _customerRepository.AddAsync(customer);
        await _serviceRepository.AddAsync(service);
        await _providerRepository.AddAsync(prov1);
        await _providerRepository.AddAsync(prov2);
        await _proposalRepository.AddAsync(prop1);
        await _proposalRepository.AddAsync(prop2);

        var appService = CreateService();

        // Cliente vê todas as propostas do leilão
        var custResult = await appService.GetProposalsByServiceIdAsync(service.Id, customerUser.Id, isAdmin: false);
        Assert.True(custResult.IsSuccess);
        Assert.Equal(2, custResult.Value!.Count());

        // Prestador 1 vê apenas a própria proposta
        var prov1Result = await appService.GetProposalsByServiceIdAsync(service.Id, provUser1.Id, isAdmin: false);
        Assert.True(prov1Result.IsSuccess);
        var single = Assert.Single(prov1Result.Value!);
        Assert.Equal(prop1.Id, single.Id);

        // Usuário terceiro não prestador recebe FORBIDDEN
        var strangerResult = await appService.GetProposalsByServiceIdAsync(service.Id, Guid.NewGuid(), isAdmin: false);
        Assert.True(strangerResult.IsFailure);
        Assert.Equal("FORBIDDEN", strangerResult.ErrorCode);
    }

    [Fact]
    public async Task AcceptProposalAsync_ShouldTriggerEscrowHold_AndRealtimeNotifications()
    {
        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };
        var provUser = new User { Id = Guid.NewGuid(), Name = "Prestador" };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = provUser.Id, User = provUser };
        var service = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, Customer = customer, ServiceStatus = ServiceStatus.UnderNegotiation };
        var proposal = new Proposal
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            Service = service,
            ProviderId = provider.Id,
            Provider = provider,
            ProposedPrice = 320m,
            ProposalStatus = ProposalStatus.Pending
        };

        await _customerRepository.AddAsync(customer);
        await _providerRepository.AddAsync(provider);
        await _serviceRepository.AddAsync(service);
        await _proposalRepository.AddAsync(proposal);

        var appService = CreateService();
        var result = await appService.AcceptProposalAsync(new AcceptProposalRequest(customerUser.Id, proposal.Id), customerUser.Id, isAdmin: false);

        Assert.True(result.IsSuccess);
        Assert.Contains(service.Id, _walletService.EscrowHeldServices);
        Assert.Contains(_trackingNotification.Events, e => e.ServiceId == service.Id && e.EventType == "proposal_accepted");
        Assert.Contains(_chatNotification.Events, e => e.ProposalId == proposal.Id && e.EventType == "proposal_updated");
    }

    [Fact]
    public async Task ProposalsController_EndToEndNegotiation_CounterAcceptAndGetByIdForbiddenForStranger()
    {
        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };
        var provUser = new User { Id = Guid.NewGuid(), Name = "Prestador" };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = provUser.Id, User = provUser };
        var service = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, Customer = customer, ServiceStatus = ServiceStatus.Open };

        await _customerRepository.AddAsync(customer);
        await _providerRepository.AddAsync(provider);
        await _serviceRepository.AddAsync(service);

        // 1. Prestador envia proposta pelo controller
        var providerCtrl = CreateController(provUser.Id, "ServiceProvider");
        var proposeRes = await providerCtrl.ProposePrice(new ProposePriceRequest(provUser.Id, service.Id, 400m, "Instalação completa", "4h"));
        var okPropose = Assert.IsType<OkObjectResult>(proposeRes);
        var createdProp = Assert.IsType<ProposalResponseDto>(okPropose.Value);
        var proposalEntity = _proposalRepository.Proposals.First();
        proposalEntity.Service = service;
        proposalEntity.Provider = provider;

        // 2. Cliente faz contraproposta
        var customerCtrl = CreateController(customerUser.Id, "Customer");
        var counterRes = await customerCtrl.CounterProposal(new CounterProposalRequest(customerUser.Id, createdProp.Id, 350m, "Fechamos por 350?"));
        var okCounter = Assert.IsType<OkObjectResult>(counterRes);
        var counteredDto = Assert.IsType<ProposalResponseDto>(okCounter.Value);
        Assert.Equal("CounterOffered", counteredDto.Status);
        Assert.Equal(350m, counteredDto.CounterPrice);

        // 3. Prestador aceita contraproposta
        var acceptCounterRes = await providerCtrl.AcceptCounter(createdProp.Id);
        var okAccept = Assert.IsType<OkObjectResult>(acceptCounterRes);
        var acceptedDto = Assert.IsType<ProposalResponseDto>(okAccept.Value);
        Assert.Equal("Accepted", acceptedDto.Status);
        Assert.Equal(350m, acceptedDto.ProposedPrice);
        Assert.Contains(service.Id, _walletService.EscrowHeldServices);

        // 4. Terceiro estranho tenta visualizar a proposta por ID -> 403 Forbid
        var strangerCtrl = CreateController(Guid.NewGuid(), "Customer");
        var getByStranger = await strangerCtrl.GetById(createdProp.Id);
        Assert.IsType<ForbidResult>(getByStranger);
    }

    // ── Fakes ────────────────────────────────────────────────────────────────

    private class FakeTrackingNotification : ITrackingNotificationService
    {
        public List<(Guid ServiceId, string EventType)> Events { get; } = [];
        public Task NotifyServiceUpdateAsync(Guid serviceId, string eventType, object? payload = null)
        {
            Events.Add((serviceId, eventType));
            return Task.CompletedTask;
        }
    }

    private class FakeChatNotification : IChatNotificationService
    {
        public List<(Guid ProposalId, Guid? ServiceId, string EventType)> Events { get; } = [];
        public Task NotifyChatUpdateAsync(Guid proposalId, Guid? serviceId, string eventType, object? payload = null)
        {
            Events.Add((proposalId, serviceId, eventType));
            return Task.CompletedTask;
        }
        public bool HasActiveSubscribers(Guid? proposalId, Guid? serviceId) => false;
    }

    private class FakeWalletService : IWalletApplicationService
    {
        public List<Guid> EscrowHeldServices { get; } = [];
        public Task<Result> HoldEscrowForServiceAsync(Guid serviceId)
        {
            EscrowHeldServices.Add(serviceId);
            return Task.FromResult(Result.Success());
        }
        public Task<Result> ReleaseEscrowForServiceAsync(Guid serviceId, decimal? finalPrice = null)
            => Task.FromResult(Result.Success());
        public Task<Result<WalletSummaryDto>> GetSummaryAsync(Guid providerOrUserId, Guid callerUserId, bool isAdmin)
            => Task.FromResult(Result<WalletSummaryDto>.Failure("N/A", "N/A"));
        public Task<Result<WalletStatementResponseDto>> GetStatementAsync(Guid providerOrUserId, WalletStatementFilterDto filter, Guid callerUserId, bool isAdmin)
            => Task.FromResult(Result<WalletStatementResponseDto>.Failure("N/A", "N/A"));
        public Task<Result<WithdrawalResponseDto>> RequestWithdrawalAsync(CreateWithdrawalRequestDto request, Guid callerUserId, bool isAdmin)
            => Task.FromResult(Result<WithdrawalResponseDto>.Failure("N/A", "N/A"));
        public Task<Result<EscrowCheckoutPixDto>> GenerateEscrowPixCheckoutAsync(Guid serviceId, Guid callerUserId, bool isAdmin)
            => Task.FromResult(Result<EscrowCheckoutPixDto>.Failure("N/A", "N/A"));
        public Task<Result> SendPixInvoiceEmailAsync(Guid serviceId, Guid callerUserId, bool isAdmin)
            => Task.FromResult(Result.Success());
        public Task<Result> ProcessDelFinanceWebhookAsync(DelFinanceWebhookPayload payload)
            => Task.FromResult(Result.Success());
    }

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
        public Task<IEnumerable<Appointment>> GetByProviderIdWithDetailsAsync(Guid providerId) => Task.FromResult(Appointments.Where(a => a.ProviderId == providerId));
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
