using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Xunit;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Services;
using WorkEz.Infra.Data.Context;
using WorkEz.Infra.Data.MessageBroker;
using WorkEz.Infra.Data.Repositories;

namespace WorkEz.WebUID.Tests;

public class RoadmapPhase3Tests
{
    private class FakePushNotificationService : IPushNotificationService
    {
        public List<(Guid UserId, string Title, string Body, object? Data)> UserPushes { get; } = [];
        public List<(List<Guid> UserIds, string Title, string Body, object? Data)> MultiUserPushes { get; } = [];

        public Task<Result<UserDeviceToken>> RegisterDeviceTokenAsync(RegisterDeviceTokenRequest request) =>
            Task.FromResult(Result<UserDeviceToken>.Success(new UserDeviceToken()));

        public Task<Result> RemoveDeviceTokenAsync(string expoPushToken) =>
            Task.FromResult(Result.Success());

        public Task<bool> SendToUserAsync(Guid userId, string title, string body, object? data = null)
        {
            UserPushes.Add((userId, title, body, data));
            return Task.FromResult(true);
        }

        public Task<int> SendToUsersAsync(IEnumerable<Guid> userIds, string title, string body, object? data = null)
        {
            var list = userIds.ToList();
            MultiUserPushes.Add((list, title, body, data));
            return Task.FromResult(list.Count);
        }

        public Task<bool> SendPushAsync(string expoPushToken, string title, string body, object? data = null) =>
            Task.FromResult(true);

        public Task<int> SendPushBatchAsync(IEnumerable<string> expoPushTokens, string title, string body, object? data = null) =>
            Task.FromResult(1);

        public Task<IEnumerable<UserDeviceToken>> GetTokensByUserAsync(Guid userId) =>
            Task.FromResult(Enumerable.Empty<UserDeviceToken>());
    }

    private static AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task CreateServiceAsync_WhenEmergency_DispatchesSosAlertPushNotificationToProviders()
    {
        using var db = CreateInMemoryDbContext();
        var serviceRepo = new ServiceRepository(db);
        var apptRepo = new AppointmentRepository(db);
        var providerRepo = new ServiceProviderRepository(db);
        var customerRepo = new BaseRepository<Customer>(db);
        var addressRepo = new BaseRepository<Address>(db);
        var userRepo = new BaseRepository<User>(db);
        var fakePush = new FakePushNotificationService();

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente Teste", Role = UserRole.Customer, Email = "cli@test.com" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };

        var provUser1 = new User { Id = Guid.NewGuid(), Name = "Prestador 1", Role = UserRole.ServiceProvider, Email = "prov1@test.com" };
        var prov1 = new WorkEz.Domain.Entities.ServiceProvider { Id = Guid.NewGuid(), UserId = provUser1.Id, User = provUser1 };

        var provUser2 = new User { Id = Guid.NewGuid(), Name = "Prestador 2", Role = UserRole.ServiceProvider, Email = "prov2@test.com" };
        var prov2 = new WorkEz.Domain.Entities.ServiceProvider { Id = Guid.NewGuid(), UserId = provUser2.Id, User = provUser2 };

        db.Users.AddRange(customerUser, provUser1, provUser2);
        db.Customers.Add(customer);
        db.Providers.AddRange(prov1, prov2);
        await db.SaveChangesAsync();

        var serviceAppService = new ServiceApplicationService(
            serviceRepo,
            apptRepo,
            providerRepo,
            customerRepo,
            addressRepo,
            userRepo,
            null,
            null,
            fakePush
        );

        var request = new CreateServiceRequest
        {
            Title = "Cano Estourado Vazamento",
            Description = "Alagamento na cozinha!",
            UrgencyLevel = "Emergency",
            Address = new CreateAddressDto
            {
                Street = "Av Paulista",
                City = "São Paulo",
                State = "SP"
            }
        };

        var result = await serviceAppService.CreateServiceAsync(customer.Id, request, customerUser.Id, false);
        Assert.True(result.IsSuccess);

        // Deve ter disparado push notification para os prestadores cadastrados
        Assert.Single(fakePush.MultiUserPushes);
        var push = fakePush.MultiUserPushes[0];
        Assert.Contains(provUser1.Id, push.UserIds);
        Assert.Contains(provUser2.Id, push.UserIds);
        Assert.Contains("ALERTA SOS", push.Title);
    }

    [Fact]
    public async Task CounterProposalAsync_DispatchesPushNotificationToProvider()
    {
        using var db = CreateInMemoryDbContext();
        var proposalRepo = new ProposalRepository(db);
        var serviceRepo = new ServiceRepository(db);
        var chatMsgRepo = new ChatMessageRepository(db);
        var providerRepo = new BaseRepository<WorkEz.Domain.Entities.ServiceProvider>(db);
        var customerRepo = new BaseRepository<Customer>(db);
        var fakePush = new FakePushNotificationService();

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente", Role = UserRole.Customer, Email = "cli@test.com" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };

        var providerUser = new User { Id = Guid.NewGuid(), Name = "Prestador Propostas", Role = UserRole.ServiceProvider, Email = "prov@test.com" };
        var provider = new WorkEz.Domain.Entities.ServiceProvider { Id = Guid.NewGuid(), UserId = providerUser.Id, User = providerUser };

        var service = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Customer = customer,
            Title = "Instalação Elétrica",
            ServiceStatus = ServiceStatus.Open
        };

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

        db.Users.AddRange(customerUser, providerUser);
        db.Customers.Add(customer);
        db.Providers.Add(provider);
        db.Services.Add(service);
        db.Proposals.Add(proposal);
        await db.SaveChangesAsync();

        var apptRepo = new AppointmentRepository(db);
        var proposalDomainService = new ProposalDomainService(
            proposalRepo, serviceRepo, apptRepo, providerRepo, customerRepo, new BaseMessageBroker());
        var proposalAppService = new ProposalApplicationService(
            proposalDomainService,
            chatMsgRepo,
            serviceRepo,
            apptRepo,
            providerRepo,
            customerRepo,
            null,
            null,
            fakePush
        );

        var counterReq = new CounterProposalRequest(customerUser.Id, proposal.Id, 180m, "Pode fazer por 180?");
        var result = await proposalAppService.CounterProposalAsync(counterReq, customerUser.Id, false);

        Assert.True(result.IsSuccess, $"Counter failed: {result.Error} ({result.ErrorCode})");
        Assert.Single(fakePush.UserPushes);
        var push = fakePush.UserPushes[0];
        Assert.Equal(providerUser.Id, push.UserId);
        Assert.Contains("contra-proposta", push.Title, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("180", push.Body);
    }

    [Fact]
    public async Task AcceptCounterAsync_DispatchesPushNotificationToCustomer()
    {
        using var db = CreateInMemoryDbContext();
        var proposalRepo = new ProposalRepository(db);
        var serviceRepo = new ServiceRepository(db);
        var chatMsgRepo = new ChatMessageRepository(db);
        var providerRepo = new BaseRepository<WorkEz.Domain.Entities.ServiceProvider>(db);
        var customerRepo = new BaseRepository<Customer>(db);
        var fakePush = new FakePushNotificationService();

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente", Role = UserRole.Customer, Email = "cli@test.com" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };

        var providerUser = new User { Id = Guid.NewGuid(), Name = "Prestador Aceite", Role = UserRole.ServiceProvider, Email = "prov@test.com" };
        var provider = new WorkEz.Domain.Entities.ServiceProvider { Id = Guid.NewGuid(), UserId = providerUser.Id, User = providerUser };

        var service = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Customer = customer,
            Title = "Reparo Hidráulico",
            ServiceStatus = ServiceStatus.Open
        };

        var proposal = new Proposal
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            Service = service,
            ProviderId = provider.Id,
            Provider = provider,
            ProposedPrice = 250m,
            CounterPrice = 220m,
            ProposalStatus = ProposalStatus.CounterOffered
        };

        db.Users.AddRange(customerUser, providerUser);
        db.Customers.Add(customer);
        db.Providers.Add(provider);
        db.Services.Add(service);
        db.Proposals.Add(proposal);
        await db.SaveChangesAsync();

        var apptRepo = new AppointmentRepository(db);
        var proposalDomainService = new ProposalDomainService(
            proposalRepo, serviceRepo, apptRepo, providerRepo, customerRepo, new BaseMessageBroker());
        var proposalAppService = new ProposalApplicationService(
            proposalDomainService,
            chatMsgRepo,
            serviceRepo,
            apptRepo,
            providerRepo,
            customerRepo,
            null,
            null,
            fakePush
        );

        var acceptReq = new AcceptCounterRequest(providerUser.Id, proposal.Id);
        var result = await proposalAppService.AcceptCounterAsync(acceptReq, providerUser.Id, false);

        Assert.True(result.IsSuccess, $"Accept failed: {result.Error} ({result.ErrorCode})");
        Assert.Single(fakePush.UserPushes);
        var push = fakePush.UserPushes[0];
        Assert.Equal(customerUser.Id, push.UserId);
        Assert.Contains("aceita", push.Title, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("220", push.Body);
    }

    [Fact]
    public async Task RejectCounterAsync_DispatchesPushNotificationToCustomer()
    {
        using var db = CreateInMemoryDbContext();
        var proposalRepo = new ProposalRepository(db);
        var serviceRepo = new ServiceRepository(db);
        var chatMsgRepo = new ChatMessageRepository(db);
        var providerRepo = new BaseRepository<WorkEz.Domain.Entities.ServiceProvider>(db);
        var customerRepo = new BaseRepository<Customer>(db);
        var fakePush = new FakePushNotificationService();

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente", Role = UserRole.Customer, Email = "cli@test.com" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };

        var providerUser = new User { Id = Guid.NewGuid(), Name = "Prestador Recusa", Role = UserRole.ServiceProvider, Email = "prov@test.com" };
        var provider = new WorkEz.Domain.Entities.ServiceProvider { Id = Guid.NewGuid(), UserId = providerUser.Id, User = providerUser };

        var service = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Customer = customer,
            Title = "Pintura Externa",
            ServiceStatus = ServiceStatus.Open
        };

        var proposal = new Proposal
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            Service = service,
            ProviderId = provider.Id,
            Provider = provider,
            ProposedPrice = 500m,
            CounterPrice = 400m,
            ProposalStatus = ProposalStatus.CounterOffered
        };

        db.Users.AddRange(customerUser, providerUser);
        db.Customers.Add(customer);
        db.Providers.Add(provider);
        db.Services.Add(service);
        db.Proposals.Add(proposal);
        await db.SaveChangesAsync();

        var apptRepo = new AppointmentRepository(db);
        var proposalDomainService = new ProposalDomainService(
            proposalRepo, serviceRepo, apptRepo, providerRepo, customerRepo, new BaseMessageBroker());
        var proposalAppService = new ProposalApplicationService(
            proposalDomainService,
            chatMsgRepo,
            serviceRepo,
            apptRepo,
            providerRepo,
            customerRepo,
            null,
            null,
            fakePush
        );

        var rejectReq = new RejectCounterRequest(providerUser.Id, proposal.Id);
        var result = await proposalAppService.RejectCounterAsync(rejectReq, providerUser.Id, false);

        Assert.True(result.IsSuccess, $"Reject failed: {result.Error} ({result.ErrorCode})");
        Assert.Single(fakePush.UserPushes);
        var push = fakePush.UserPushes[0];
        Assert.Equal(customerUser.Id, push.UserId);
        Assert.Contains("recusada", push.Title, StringComparison.OrdinalIgnoreCase);
    }
}
