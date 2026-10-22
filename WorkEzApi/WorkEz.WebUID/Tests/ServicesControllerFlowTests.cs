using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Infra.Data.Context;
using WorkEz.Infra.Data.Repositories;
using WorkEz.WebUID.Controllers;
using WorkEz.WebUID.WebSockets;
using ServiceProviderEntity = WorkEz.Domain.Entities.ServiceProvider;

namespace WorkEz.WebUID.Tests;

public class ServicesControllerFlowTests
{
    private class FakeTrackingNotificationService : ITrackingNotificationService
    {
        public List<(Guid ServiceId, string EventType, object? Payload)> Notifications { get; } = [];

        public Task NotifyServiceUpdateAsync(Guid serviceId, string eventType, object? payload = null)
        {
            Notifications.Add((serviceId, eventType, payload));
            return Task.CompletedTask;
        }
    }

    private class FakeOpportunityService : IServiceOpportunityApplicationService
    {
        public List<OpportunityCallDto> ReturnList { get; set; } = [];

        public Task<Result<IEnumerable<OpportunityCallDto>>> GetOpportunitiesAsync(Guid providerUserId)
        {
            return Task.FromResult(Result<IEnumerable<OpportunityCallDto>>.Success(ReturnList.AsEnumerable()));
        }
    }

    private static AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static ServicesController CreateController(
        AppDbContext db,
        FakeTrackingNotificationService? fakeTracker = null,
        FakeOpportunityService? fakeOpp = null)
    {
        var serviceRepo = new ServiceRepository(db);
        var apptRepo = new AppointmentRepository(db);
        var providerRepo = new ServiceProviderRepository(db);
        var customerRepo = new BaseRepository<Customer>(db);
        var addressRepo = new BaseRepository<Address>(db);
        var userRepo = new BaseRepository<User>(db);

        var serviceAppService = new ServiceApplicationService(
            serviceRepo,
            apptRepo,
            providerRepo,
            customerRepo,
            addressRepo,
            userRepo,
            fakeTracker
        );

        return new ServicesController(fakeOpp ?? new FakeOpportunityService(), serviceAppService);
    }

    private static void Authenticate(ControllerBase controller, Guid userId, string role = "Customer")
    {
        var identity = new ClaimsIdentity(
            [new Claim("sub", userId.ToString()), new Claim("role", role)],
            "TestAuth");
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(identity)
            }
        };
    }

    [Fact]
    public async Task GetAcceptedByProviderUser_ShouldReturnOnlyAppointmentsForGivenProvider()
    {
        using var db = CreateInMemoryDbContext();
        var fakeTracker = new FakeTrackingNotificationService();
        var controller = CreateController(db, fakeTracker);

        var providerUser = new User { Id = Guid.NewGuid(), Name = "Luis Prestador", Role = UserRole.ServiceProvider };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = providerUser.Id };
        db.Users.Add(providerUser);
        db.Providers.Add(provider);

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente 1" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id };
        db.Users.Add(customerUser);
        db.Customers.Add(customer);

        var service1 = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, Title = "Chamado Aceito", ServiceStatus = ServiceStatus.Accepted };
        db.Services.Add(service1);

        var appt1 = new Appointment
        {
            Id = Guid.NewGuid(),
            ProviderId = provider.Id,
            CustomerId = customer.Id,
            ServiceId = service1.Id,
            FinalPrice = 850m,
            AppointmentStatus = AppointmentStatus.Confirmed,
            ScheduledDate = DateTime.UtcNow
        };
        db.Appointments.Add(appt1);
        await db.SaveChangesAsync();

        Authenticate(controller, providerUser.Id, "ServiceProvider");

        var actionResult = await controller.GetAcceptedByProviderUser(providerUser.Id);
        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var list = Assert.IsAssignableFrom<IEnumerable<OpportunityCallDto>>(okResult.Value);

        Assert.Single(list);
        var item = list.First();
        Assert.Equal("accepted", item.Status);
        Assert.Equal(850m, item.SuggestedPrice);
        Assert.Equal("Cliente 1", item.ClientName);
    }

    [Fact]
    public async Task StartDisplacement_ShouldSetStatusToOnTheWay_AndNotifyViaWebSocket()
    {
        using var db = CreateInMemoryDbContext();
        var fakeTracker = new FakeTrackingNotificationService();
        var controller = CreateController(db, fakeTracker);

        var providerUser = new User { Id = Guid.NewGuid(), Name = "Prestador 1", Role = UserRole.ServiceProvider };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = providerUser.Id, User = providerUser };
        db.Users.Add(providerUser);
        db.Providers.Add(provider);

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente 1" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };
        db.Users.Add(customerUser);
        db.Customers.Add(customer);

        var service = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Customer = customer,
            ServiceStatus = ServiceStatus.Accepted,
            Title = "Reparo"
        };
        var appt = new Appointment
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            ProviderId = provider.Id,
            Provider = provider,
            AppointmentStatus = AppointmentStatus.Confirmed
        };
        db.Services.Add(service);
        db.Appointments.Add(appt);
        await db.SaveChangesAsync();

        Authenticate(controller, providerUser.Id, "ServiceProvider");

        var result = await controller.StartDisplacement(service.Id);
        var okResult = Assert.IsType<OkObjectResult>(result);

        // Verifica no banco
        var updatedService = await db.Services.FindAsync(service.Id);
        Assert.NotNull(updatedService);
        Assert.Equal(ServiceStatus.OnTheWay, updatedService.ServiceStatus);

        var updatedAppt = await db.Appointments.FirstAsync(a => a.ServiceId == service.Id);
        Assert.Equal(AppointmentStatus.InProgress, updatedAppt.AppointmentStatus);

        // Verifica notificação WebSocket
        Assert.Single(fakeTracker.Notifications);
        var notification = fakeTracker.Notifications.First();
        Assert.Equal(service.Id, notification.ServiceId);
        Assert.Equal("status_changed", notification.EventType);
    }

    [Fact]
    public async Task StartService_ShouldSetStatusToInProgress_AndNotifyViaWebSocket()
    {
        using var db = CreateInMemoryDbContext();
        var fakeTracker = new FakeTrackingNotificationService();
        var controller = CreateController(db, fakeTracker);

        var providerUser = new User { Id = Guid.NewGuid(), Name = "Prestador 1", Role = UserRole.ServiceProvider };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = providerUser.Id, User = providerUser };
        db.Users.Add(providerUser);
        db.Providers.Add(provider);

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente 1" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };
        db.Users.Add(customerUser);
        db.Customers.Add(customer);

        var service = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Customer = customer,
            ServiceStatus = ServiceStatus.OnTheWay,
            Title = "Manutenção"
        };
        var appt = new Appointment
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            ProviderId = provider.Id,
            Provider = provider,
            AppointmentStatus = AppointmentStatus.InProgress
        };
        db.Services.Add(service);
        db.Appointments.Add(appt);
        await db.SaveChangesAsync();

        Authenticate(controller, providerUser.Id, "ServiceProvider");

        var result = await controller.StartService(service.Id);
        Assert.IsType<OkObjectResult>(result);

        var updated = await db.Services.FindAsync(service.Id);
        Assert.NotNull(updated);
        Assert.Equal(ServiceStatus.InProgress, updated.ServiceStatus);

        Assert.Single(fakeTracker.Notifications);
        Assert.Equal("status_changed", fakeTracker.Notifications[0].EventType);
    }

    [Fact]
    public async Task CompleteService_ShouldSetStatusWaitingPayment_UpdateFinalPrice_AndNotifyWebSocket()
    {
        using var db = CreateInMemoryDbContext();
        var fakeTracker = new FakeTrackingNotificationService();
        var controller = CreateController(db, fakeTracker);

        var providerUser = new User { Id = Guid.NewGuid(), Name = "Prestador 1", Role = UserRole.ServiceProvider };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = providerUser.Id, User = providerUser };
        db.Users.Add(providerUser);
        db.Providers.Add(provider);

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente 1" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };
        db.Users.Add(customerUser);
        db.Customers.Add(customer);

        var service = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Customer = customer,
            ServiceStatus = ServiceStatus.InProgress,
            Title = "Instalação Ar"
        };
        var appt = new Appointment
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            ProviderId = provider.Id,
            Provider = provider,
            FinalPrice = 500m,
            AppointmentStatus = AppointmentStatus.InProgress
        };
        db.Services.Add(service);
        db.Appointments.Add(appt);
        await db.SaveChangesAsync();

        Authenticate(controller, providerUser.Id, "ServiceProvider");

        // Prestador conclui e informa o valor final (ex: R$ 850,00)
        var result = await controller.CompleteService(service.Id, 850m);
        Assert.IsType<OkObjectResult>(result);

        var updatedService = await db.Services.FindAsync(service.Id);
        Assert.NotNull(updatedService);
        // Conclusão pelo prestador aguarda o pagamento (PIX) do cliente; Completed só após ConfirmPayment.
        Assert.Equal(ServiceStatus.WaitingPayment, updatedService.ServiceStatus);

        var updatedAppt = await db.Appointments.FirstAsync(a => a.ServiceId == service.Id);
        Assert.Equal(850m, updatedAppt.FinalPrice);
        Assert.Equal(AppointmentStatus.InProgress, updatedAppt.AppointmentStatus);

        Assert.Single(fakeTracker.Notifications);
        Assert.Equal("status_changed", fakeTracker.Notifications[0].EventType);
    }

    [Fact]
    public async Task UpdateStatus_Cancel_ShouldSetCancelled_AndNotifyWebSocket()
    {
        using var db = CreateInMemoryDbContext();
        var fakeTracker = new FakeTrackingNotificationService();
        var controller = CreateController(db, fakeTracker);

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente 1" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };
        db.Users.Add(customerUser);
        db.Customers.Add(customer);

        var service = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Customer = customer,
            ServiceStatus = ServiceStatus.Open,
            Title = "Vistoria"
        };
        db.Services.Add(service);
        await db.SaveChangesAsync();

        Authenticate(controller, customerUser.Id, "Customer");

        var result = await controller.UpdateStatus(service.Id, false);
        Assert.IsType<OkObjectResult>(result);

        var updated = await db.Services.FindAsync(service.Id);
        Assert.NotNull(updated);
        Assert.Equal(ServiceStatus.Cancelled, updated.ServiceStatus);

        Assert.Single(fakeTracker.Notifications);
        Assert.Equal("status_changed", fakeTracker.Notifications[0].EventType);
    }

    [Fact]
    public async Task GetById_ShouldReturnDetailedService_WithPriceAndClientPhone()
    {
        using var db = CreateInMemoryDbContext();
        var fakeTracker = new FakeTrackingNotificationService();
        var controller = CreateController(db, fakeTracker);

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Mariana Silva", Phone = "(11) 98888-7777" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };
        db.Users.Add(customerUser);
        db.Customers.Add(customer);

        var providerUser = new User { Id = Guid.NewGuid(), Name = "Carlos Técnico" };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = providerUser.Id, User = providerUser, AverageRating = 4.9m };
        db.Users.Add(providerUser);
        db.Providers.Add(provider);

        var service = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Customer = customer,
            Title = "Troca de Chuveiro",
            Description = "Chuveiro 220v queimado",
            ServiceStatus = ServiceStatus.Accepted,
            CreatedAt = DateTime.UtcNow
        };
        db.Services.Add(service);

        var appt = new Appointment
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            ProviderId = provider.Id,
            Provider = provider,
            FinalPrice = 180m,
            AppointmentStatus = AppointmentStatus.Confirmed
        };
        db.Appointments.Add(appt);
        await db.SaveChangesAsync();

        Authenticate(controller, customerUser.Id, "Customer");

        var actionResult = await controller.GetById(service.Id);
        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var data = Assert.IsType<ServiceDetailDto>(okResult.Value);

        Assert.Equal(service.Id, data.Id);
        Assert.Equal("Troca de Chuveiro", data.Category);
        Assert.Equal("Mariana Silva", data.ClientName);
        Assert.Equal("(11) 98888-7777", data.ClientPhone);
        Assert.Equal(180m, data.Price);
        Assert.Equal("Endereço cadastrado", data.Address);
        Assert.NotNull(data.Professional);
        Assert.Equal("Carlos Técnico", data.Professional.Name);
    }

    [Fact]
    public async Task GetById_ShouldReturnClientPhoto_Images_AndFormattedAddress()
    {
        using var db = CreateInMemoryDbContext();
        var fakeTracker = new FakeTrackingNotificationService();
        var controller = CreateController(db, fakeTracker);

        var customerUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Luis Felipe",
            Phone = "(12) 99999-8888",
            ProfilePicture = "https://example.com/profiles/luis.png"
        };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };
        db.Users.Add(customerUser);
        db.Customers.Add(customer);

        var address = new Address
        {
            Id = Guid.NewGuid(),
            UserId = customerUser.Id,
            Street = "Rua das Palmeiras",
            Number = "450",
            Complement = "Bloco B",
            Neighborhood = "Jardim América",
            City = "São José dos Campos",
            State = "SP"
        };
        db.Addresses.Add(address);

        var service = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Customer = customer,
            AddressId = address.Id,
            Address = address,
            Title = "Chamado para Técnico",
            Description = "Reparo em notebook",
            ImageUrl = "[\"https://example.com/img1.jpg\",\"https://example.com/img2.jpg\"]",
            ServiceStatus = ServiceStatus.Open,
            CreatedAt = DateTime.UtcNow
        };
        db.Services.Add(service);
        await db.SaveChangesAsync();

        Authenticate(controller, customerUser.Id, "Customer");

        var actionResult = await controller.GetById(service.Id);
        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var data = Assert.IsType<ServiceDetailDto>(okResult.Value);

        Assert.Equal(service.Id, data.Id);
        Assert.Equal("https://example.com/profiles/luis.png", data.ClientPhoto);
        Assert.Equal("[\"https://example.com/img1.jpg\",\"https://example.com/img2.jpg\"]", data.ImageUrl);
        Assert.Equal(2, data.Images.Length);
        Assert.Equal("https://example.com/img1.jpg", data.Images[0]);
        Assert.Equal("https://example.com/img2.jpg", data.Images[1]);
        Assert.Equal("Rua das Palmeiras, 450 (Bloco B) - Jardim América - São José dos Campos/SP", data.Address);
        Assert.Equal("Jardim América, São José dos Campos/SP", data.AddressApproximate);
    }

    [Fact]
    public async Task GetById_ShouldReturnProviderPhoto_WhenProposalAccepted()
    {
        using var db = CreateInMemoryDbContext();
        var fakeTracker = new FakeTrackingNotificationService();
        var controller = CreateController(db, fakeTracker);

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente Teste" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };
        db.Users.Add(customerUser);
        db.Customers.Add(customer);

        var providerUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Prestador Teste",
            ProfilePicture = "https://example.com/provider-avatar.jpg"
        };
        var provider = new ServiceProviderEntity
        {
            Id = Guid.NewGuid(),
            UserId = providerUser.Id,
            User = providerUser,
            AverageRating = 4.8m
        };
        db.Users.Add(providerUser);
        db.Providers.Add(provider);

        var service = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Customer = customer,
            Title = "Serviço com Proposta",
            ServiceStatus = ServiceStatus.Accepted,
            CreatedAt = DateTime.UtcNow
        };
        db.Services.Add(service);

        var proposal = new Proposal
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            ProviderId = provider.Id,
            Provider = provider,
            ProposedPrice = 250m,
            ProposalStatus = ProposalStatus.Accepted,
            CreatedAt = DateTime.UtcNow
        };
        db.Proposals.Add(proposal);
        await db.SaveChangesAsync();

        Authenticate(controller, customerUser.Id, "Customer");

        var actionResult = await controller.GetById(service.Id);
        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var data = Assert.IsType<ServiceDetailDto>(okResult.Value);

        Assert.NotNull(data.Professional);
        Assert.Equal("Prestador Teste", data.Professional.Name);
        Assert.Equal("https://example.com/provider-avatar.jpg", data.Professional.Photo);
        Assert.Equal(4.8m, data.Professional.Rating);
    }

    [Fact]
    public async Task StartDisplacement_ShouldReturnForbid_WhenUserIsNotAssignedProvider()
    {
        using var db = CreateInMemoryDbContext();
        var fakeTracker = new FakeTrackingNotificationService();
        var controller = CreateController(db, fakeTracker);

        var providerUser1 = new User { Id = Guid.NewGuid(), Name = "Prestador 1" };
        var provider1 = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = providerUser1.Id, User = providerUser1 };
        var attackerUser = new User { Id = Guid.NewGuid(), Name = "Atacante" };
        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente 1" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };
        db.Users.AddRange(providerUser1, attackerUser, customerUser);
        db.Customers.Add(customer);
        db.Providers.Add(provider1);

        var service = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Customer = customer,
            ServiceStatus = ServiceStatus.Accepted
        };
        var appt = new Appointment { Id = Guid.NewGuid(), ServiceId = service.Id, ProviderId = provider1.Id, Provider = provider1 };
        db.Services.Add(service);
        db.Appointments.Add(appt);
        await db.SaveChangesAsync();

        // Atacante tenta iniciar deslocamento de chamado de outro
        Authenticate(controller, attackerUser.Id, "ServiceProvider");

        var result = await controller.StartDisplacement(service.Id);
        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task CompleteService_ShouldReturnUnauthorized_WhenNotAuthenticated()
    {
        using var db = CreateInMemoryDbContext();
        var fakeTracker = new FakeTrackingNotificationService();
        var controller = CreateController(db, fakeTracker);

        var service = new Service { Id = Guid.NewGuid(), ServiceStatus = ServiceStatus.InProgress };
        db.Services.Add(service);
        await db.SaveChangesAsync();

        // Não autenticado
        var result = await controller.CompleteService(service.Id, 100m);
        Assert.IsType<UnauthorizedResult>(result);
    }
}
