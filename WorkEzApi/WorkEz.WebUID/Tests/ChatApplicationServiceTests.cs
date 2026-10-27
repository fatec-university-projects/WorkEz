using System.Linq.Expressions;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Interfaces;
using WorkEz.WebUID.Controllers;
using ServiceProviderEntity = WorkEz.Domain.Entities.ServiceProvider;

namespace WorkEz.WebUID.Tests;

public class ChatApplicationServiceTests
{
    private readonly FakeChatMessageRepository _chatRepo = new();
    private readonly FakeProposalRepository _proposalRepo = new();
    private readonly FakeServiceRepository _serviceRepo = new();
    private readonly FakeChatNotification _chatNotification = new();

    private ChatApplicationService CreateService() =>
        new(_chatRepo, _proposalRepo, _serviceRepo, chatNotification: _chatNotification);

    private ChatController CreateController(Guid? authenticatedUserId = null, string role = "Customer")
    {
        var controller = new ChatController(CreateService());
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
            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
        }
        return controller;
    }

    [Fact]
    public async Task SendMessageAsync_WithValidProposal_ShouldSucceed()
    {
        var service = new Service { Id = Guid.NewGuid(), Title = "Limpeza", ServiceStatus = ServiceStatus.InProgress };
        var proposal = new Proposal
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            Service = service,
            ProposedPrice = 120m,
            ProposalStatus = ProposalStatus.Accepted
        };

        await _serviceRepo.AddAsync(service);
        await _proposalRepo.AddAsync(proposal);

        var chatService = CreateService();
        var command = new SendChatMessageCommand(
            SenderId: Guid.NewGuid(),
            Content: "Olá, chego em 10 minutos!",
            IsFromProvider: true,
            ProposalId: proposal.Id
        );

        var result = await chatService.SendMessageAsync(command);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal("Olá, chego em 10 minutos!", result.Value.Content);
        Assert.True(result.Value.IsFromProvider);
        Assert.Equal(service.Id, result.Value.ServiceId);
    }

    [Fact]
    public async Task SendMessageAsync_EmptyContent_ShouldFail()
    {
        var chatService = CreateService();
        var command = new SendChatMessageCommand(
            SenderId: Guid.NewGuid(),
            Content: "   ",
            IsFromProvider: false,
            ProposalId: Guid.NewGuid()
        );

        var result = await chatService.SendMessageAsync(command);

        Assert.True(result.IsFailure);
        Assert.Equal("EMPTY_CONTENT", result.ErrorCode);
    }

    [Fact]
    public async Task SendMessageAsync_DirectServiceChatWithoutProposal_ShouldSucceed()
    {
        var service = new Service { Id = Guid.NewGuid(), Title = "Manutenção", ServiceStatus = ServiceStatus.Open };
        await _serviceRepo.AddAsync(service);

        var chatService = CreateService();
        var command = new SendChatMessageCommand(
            SenderId: Guid.NewGuid(),
            Content: "Gostaria de saber se você atende aos sábados.",
            IsFromProvider: false,
            ServiceId: service.Id
        );

        var result = await chatService.SendMessageAsync(command);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(service.Id, result.Value.ServiceId);
        Assert.Null(result.Value.ProposalId);
    }

    [Fact]
    public async Task SendMessageAsync_CompletedService_ShouldFail()
    {
        var service = new Service { Id = Guid.NewGuid(), Title = "Pintura", ServiceStatus = ServiceStatus.Completed };
        await _serviceRepo.AddAsync(service);

        var chatService = CreateService();
        var command = new SendChatMessageCommand(
            SenderId: Guid.NewGuid(),
            Content: "Testando chat finalizado",
            IsFromProvider: false,
            ServiceId: service.Id
        );

        var result = await chatService.SendMessageAsync(command);

        Assert.True(result.IsFailure);
        Assert.Equal("SERVICE_FINISHED", result.ErrorCode);
    }

    [Fact]
    public async Task SendMessageAsync_RejectedProposal_ShouldFail()
    {
        var proposal = new Proposal
        {
            Id = Guid.NewGuid(),
            ServiceId = Guid.NewGuid(),
            ProposedPrice = 200m,
            ProposalStatus = ProposalStatus.Rejected
        };
        await _proposalRepo.AddAsync(proposal);

        var chatService = CreateService();
        var command = new SendChatMessageCommand(
            SenderId: Guid.NewGuid(),
            Content: "Oi",
            IsFromProvider: false,
            ProposalId: proposal.Id
        );

        var result = await chatService.SendMessageAsync(command);

        Assert.True(result.IsFailure);
        Assert.Equal("PROPOSAL_REJECTED", result.ErrorCode);
    }

    [Fact]
    public async Task SendMessageAsync_PendingProposal_ShouldTransitionToNegotiationOpen_AndNotifyRealtime()
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
            ProposedPrice = 200m,
            ProposalStatus = ProposalStatus.Pending
        };

        await _serviceRepo.AddAsync(service);
        await _proposalRepo.AddAsync(proposal);

        var chatService = CreateService();
        var command = new SendChatMessageCommand(customerUser.Id, "Consegue fazer hoje à tarde?", false, ProposalId: proposal.Id);

        var result = await chatService.SendMessageAsync(command, customerUser.Id, isAdmin: false);

        Assert.True(result.IsSuccess);
        Assert.Equal(ProposalStatus.NegotiationOpen, proposal.ProposalStatus);
        Assert.False(result.Value!.IsFromProvider);
        Assert.Single(_chatNotification.Notifications);
        Assert.Equal("new_message", _chatNotification.Notifications[0].EventType);
    }

    [Fact]
    public async Task ChatController_AntiIdor_ShouldReturnForbidForNonParticipant_OnSendAndRead()
    {
        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };
        var provUser = new User { Id = Guid.NewGuid(), Name = "Prestador" };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = provUser.Id, User = provUser };
        var service = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, Customer = customer, ServiceStatus = ServiceStatus.InProgress };
        var proposal = new Proposal
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            Service = service,
            ProviderId = provider.Id,
            Provider = provider,
            ProposedPrice = 200m,
            ProposalStatus = ProposalStatus.Accepted
        };
        service.Proposals.Add(proposal);

        await _serviceRepo.AddAsync(service);
        await _proposalRepo.AddAsync(proposal);

        var attackerUserId = Guid.NewGuid();
        var attackerCtrl = CreateController(attackerUserId, "Customer");

        var sendRes = await attackerCtrl.SendMessage(new SendChatMessageCommand(attackerUserId, "Mensagem intrusa", false, ProposalId: proposal.Id));
        var readPropRes = await attackerCtrl.GetMessagesByProposal(proposal.Id);
        var readSrvRes = await attackerCtrl.GetMessagesByService(service.Id);
        var activePropRes = await attackerCtrl.GetActiveProposalForService(service.Id);

        Assert.IsType<ForbidResult>(sendRes);
        Assert.IsType<ForbidResult>(readPropRes);
        Assert.IsType<ForbidResult>(readSrvRes);
        Assert.IsType<ForbidResult>(activePropRes);
    }

    [Fact]
    public async Task ChatController_AuthorizedParticipants_CanSendAndReadMessages()
    {
        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };
        var provUser = new User { Id = Guid.NewGuid(), Name = "Prestador" };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = provUser.Id, User = provUser };
        var service = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, Customer = customer, ServiceStatus = ServiceStatus.InProgress };
        var proposal = new Proposal
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            Service = service,
            ProviderId = provider.Id,
            Provider = provider,
            ProposedPrice = 200m,
            ProposalStatus = ProposalStatus.Accepted
        };
        service.Proposals.Add(proposal);

        await _serviceRepo.AddAsync(service);
        await _proposalRepo.AddAsync(proposal);

        var providerCtrl = CreateController(provUser.Id, "ServiceProvider");
        var sendRes = await providerCtrl.SendMessage(new SendChatMessageCommand(provUser.Id, "Estou chegando!", false, ProposalId: proposal.Id));
        var okSend = Assert.IsType<OkObjectResult>(sendRes);
        var sentDto = Assert.IsType<ChatMessageResponseDto>(okSend.Value);
        Assert.True(sentDto.IsFromProvider);

        var customerCtrl = CreateController(customerUser.Id, "Customer");
        var getRes = await customerCtrl.GetMessagesByProposal(proposal.Id);
        var okGet = Assert.IsType<OkObjectResult>(getRes);
        var messages = Assert.IsAssignableFrom<IEnumerable<ChatMessageResponseDto>>(okGet.Value);
        Assert.Single(messages);
    }

    [Fact]
    public async Task GetMessagesByServiceId_And_GetActiveChatProposal_WithProposalIdFallback_SucceedsForParticipant()
    {
        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };
        var provUser = new User { Id = Guid.NewGuid(), Name = "Prestador" };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = provUser.Id, User = provUser };
        var service = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, Customer = customer, ServiceStatus = ServiceStatus.Completed };
        var proposal = new Proposal
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            Service = service,
            ProviderId = provider.Id,
            Provider = provider,
            ProposedPrice = 200m,
            ProposalStatus = ProposalStatus.Rejected
        };
        service.Proposals.Add(proposal);

        await _serviceRepo.AddAsync(service);
        await _proposalRepo.AddAsync(proposal);
        await _chatRepo.SendMessageAsync(proposal.Id, service.Id, provUser.Id, "Histórico antigo", true);

        var chatService = CreateService();

        // Passando proposal.Id no lugar de serviceId não deve retornar 403 para o participante
        var msgResult = await chatService.GetMessagesByServiceIdAsync(proposal.Id, provUser.Id, isAdmin: false);
        Assert.True(msgResult.IsSuccess);
        Assert.Single(msgResult.Value!);

        var propResult = await chatService.GetActiveChatProposalByServiceIdAsync(proposal.Id, provUser.Id, isAdmin: false);
        Assert.True(propResult.IsSuccess);
        Assert.Equal(proposal.Id, propResult.Value!.Id);
        Assert.Equal("Completed", propResult.Value.ServiceStatus);
    }

    [Fact]
    public async Task SendMessage_WhenServiceCompleted_EvenWithProposalId_ReturnsServiceFinishedError()
    {
        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };
        var provUser = new User { Id = Guid.NewGuid(), Name = "Prestador" };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = provUser.Id, User = provUser };
        var service = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, Customer = customer, ServiceStatus = ServiceStatus.Completed };
        var proposal = new Proposal
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            Service = service,
            ProviderId = provider.Id,
            Provider = provider,
            ProposedPrice = 200m,
            ProposalStatus = ProposalStatus.Accepted
        };
        service.Proposals.Add(proposal);

        await _serviceRepo.AddAsync(service);
        await _proposalRepo.AddAsync(proposal);

        var chatService = CreateService();
        var sendResult = await chatService.SendMessageAsync(
            new SendChatMessageCommand(provUser.Id, "Tentando enviar após conclusão", true, ProposalId: proposal.Id),
            provUser.Id,
            isAdmin: false);

        Assert.False(sendResult.IsSuccess);
        Assert.Equal("SERVICE_FINISHED", sendResult.ErrorCode);
    }

    // ── Fakes ──────────────────────────────────────────────────────────────────

    private class FakeChatNotification : IChatNotificationService
    {
        public List<(Guid ProposalId, Guid? ServiceId, string EventType)> Notifications { get; } = [];
        public Task NotifyChatUpdateAsync(Guid proposalId, Guid? serviceId, string eventType, object? payload = null)
        {
            Notifications.Add((proposalId, serviceId, eventType));
            return Task.CompletedTask;
        }
        public bool HasActiveSubscribers(Guid? proposalId, Guid? serviceId) => false;
    }

    private class FakeChatMessageRepository : IChatMessageRepository
    {
        public List<ChatMessage> Messages { get; } = [];

        public Task<IEnumerable<ChatMessage>> GetByProposalIdAsync(Guid proposalId) =>
            Task.FromResult(Messages.Where(m => m.ProposalId == proposalId).AsEnumerable());

        public Task<IEnumerable<ChatMessage>> GetByServiceIdAsync(Guid serviceId) =>
            Task.FromResult(Messages.Where(m => m.ServiceId == serviceId).AsEnumerable());

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

        public Task<ChatMessage> SendMessageAsync(Guid proposalId, Guid senderId, string content, bool isFromProvider) =>
            SendMessageAsync(proposalId, null, senderId, content, isFromProvider);

        public Task<ChatMessage?> GetByIdAsync(Guid id) => Task.FromResult(Messages.FirstOrDefault(m => m.Id == id));
        public Task<IEnumerable<ChatMessage>> GetAllAsync() => Task.FromResult(Messages.AsEnumerable());
        public Task<IEnumerable<ChatMessage>> FindAsync(Expression<Func<ChatMessage, bool>> predicate) =>
            Task.FromResult(Messages.AsQueryable().Where(predicate).AsEnumerable());
        public Task AddAsync(ChatMessage entity) { Messages.Add(entity); return Task.CompletedTask; }
        public void Update(ChatMessage entity) { }
        public void Remove(ChatMessage entity) => Messages.Remove(entity);
        public Task<int> SaveChangesAsync() => Task.FromResult(1);
    }

    private class FakeProposalRepository : IProposalRepository
    {
        public List<Proposal> Proposals { get; } = [];
        public Task<Proposal?> GetByIdAsync(Guid id) => Task.FromResult(Proposals.FirstOrDefault(p => p.Id == id));
        public Task<IEnumerable<Proposal>> GetAllAsync() => Task.FromResult(Proposals.AsEnumerable());
        public Task<IEnumerable<Proposal>> FindAsync(Expression<Func<Proposal, bool>> predicate) =>
            Task.FromResult(Proposals.AsQueryable().Where(predicate).AsEnumerable());
        public Task AddAsync(Proposal entity) { Proposals.Add(entity); return Task.CompletedTask; }
        public void Update(Proposal entity) { }
        public void Remove(Proposal entity) => Proposals.Remove(entity);
        public Task<int> SaveChangesAsync() => Task.FromResult(1);
        public Task<IEnumerable<Proposal>> GetProposalsByServiceIdAsync(Guid serviceId) =>
            Task.FromResult(Proposals.Where(p => p.ServiceId == serviceId).AsEnumerable());
        public Task<IEnumerable<Proposal>> GetPendingProposalsByServiceIdAsync(Guid serviceId) =>
            Task.FromResult(Proposals.Where(p => p.ServiceId == serviceId && p.ProposalStatus == ProposalStatus.Pending).AsEnumerable());
        public Task<Proposal?> GetByIdWithServiceAndProviderAsync(Guid id) => GetByIdAsync(id);
        public Task<Proposal?> GetExistingProposalAsync(Guid serviceId, Guid providerId) =>
            Task.FromResult(Proposals.FirstOrDefault(p => p.ServiceId == serviceId && p.ProviderId == providerId));
        public Task<IEnumerable<Proposal>> GetProposalsByProviderUserIdAsync(Guid providerUserId) =>
            Task.FromResult(Enumerable.Empty<Proposal>());
    }

    private class FakeServiceRepository : IServiceRepository
    {
        public List<Service> Services { get; } = [];
        public Task<Service?> GetByIdAsync(Guid id) => Task.FromResult(Services.FirstOrDefault(s => s.Id == id));
        public Task<IEnumerable<Service>> GetAllAsync() => Task.FromResult(Services.AsEnumerable());
        public Task<IEnumerable<Service>> FindAsync(Expression<Func<Service, bool>> predicate) =>
            Task.FromResult(Services.AsQueryable().Where(predicate).AsEnumerable());
        public Task AddAsync(Service entity) { Services.Add(entity); return Task.CompletedTask; }
        public void Update(Service entity) { }
        public void Remove(Service entity) => Services.Remove(entity);
        public Task<int> SaveChangesAsync() => Task.FromResult(1);
        public Task<Service?> GetByIdWithDetailsAsync(Guid id) => GetByIdAsync(id);
        public Task<IEnumerable<Service>> GetServicesByCustomerAsync(Guid customerId) =>
            Task.FromResult(Services.Where(s => s.CustomerId == customerId).AsEnumerable());
    }
}
