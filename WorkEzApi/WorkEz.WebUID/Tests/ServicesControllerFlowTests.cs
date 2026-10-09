using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Infra.Data.Context;
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

    private AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task GetAcceptedByProviderUser_ShouldReturnOnlyAppointmentsForGivenProvider()
    {
        using var db = CreateInMemoryDbContext();
        var fakeTracker = new FakeTrackingNotificationService();
        var fakeOpp = new FakeOpportunityService();
        var controller = new ServicesController(fakeOpp, db, fakeTracker);

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
        var fakeOpp = new FakeOpportunityService();
        var controller = new ServicesController(fakeOpp, db, fakeTracker);

        var service = new Service { Id = Guid.NewGuid(), ServiceStatus = ServiceStatus.Accepted, Title = "Reparo" };
        var appt = new Appointment { Id = Guid.NewGuid(), ServiceId = service.Id, AppointmentStatus = AppointmentStatus.Confirmed };
        db.Services.Add(service);
        db.Appointments.Add(appt);
        await db.SaveChangesAsync();

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
        var fakeOpp = new FakeOpportunityService();
        var controller = new ServicesController(fakeOpp, db, fakeTracker);

        var service = new Service { Id = Guid.NewGuid(), ServiceStatus = ServiceStatus.OnTheWay, Title = "Manutenção" };
        db.Services.Add(service);
        await db.SaveChangesAsync();

        var result = await controller.StartService(service.Id);
        Assert.IsType<OkObjectResult>(result);

        var updated = await db.Services.FindAsync(service.Id);
        Assert.NotNull(updated);
        Assert.Equal(ServiceStatus.InProgress, updated.ServiceStatus);

        Assert.Single(fakeTracker.Notifications);
        Assert.Equal("status_changed", fakeTracker.Notifications[0].EventType);
    }

    [Fact]
    public async Task CompleteService_ShouldSetStatusCompleted_UpdateFinalPrice_AndNotifyWebSocket()
    {
        using var db = CreateInMemoryDbContext();
        var fakeTracker = new FakeTrackingNotificationService();
        var fakeOpp = new FakeOpportunityService();
        var controller = new ServicesController(fakeOpp, db, fakeTracker);

        var service = new Service { Id = Guid.NewGuid(), ServiceStatus = ServiceStatus.InProgress, Title = "Instalação Ar" };
        var appt = new Appointment { Id = Guid.NewGuid(), ServiceId = service.Id, FinalPrice = 500m, AppointmentStatus = AppointmentStatus.InProgress };
        db.Services.Add(service);
        db.Appointments.Add(appt);
        await db.SaveChangesAsync();

        // Prestador conclui e informa o valor final (ex: R$ 850,00)
        var result = await controller.CompleteService(service.Id, 850m);
        Assert.IsType<OkObjectResult>(result);

        var updatedService = await db.Services.FindAsync(service.Id);
        Assert.NotNull(updatedService);
        Assert.Equal(ServiceStatus.Completed, updatedService.ServiceStatus);

        var updatedAppt = await db.Appointments.FirstAsync(a => a.ServiceId == service.Id);
        Assert.Equal(850m, updatedAppt.FinalPrice);
        Assert.Equal(AppointmentStatus.Completed, updatedAppt.AppointmentStatus);
        Assert.NotNull(updatedAppt.CompletedAt);

        Assert.Single(fakeTracker.Notifications);
        Assert.Equal("status_changed", fakeTracker.Notifications[0].EventType);
    }

    [Fact]
    public async Task UpdateStatus_Cancel_ShouldSetCancelled_AndNotifyWebSocket()
    {
        using var db = CreateInMemoryDbContext();
        var fakeTracker = new FakeTrackingNotificationService();
        var fakeOpp = new FakeOpportunityService();
        var controller = new ServicesController(fakeOpp, db, fakeTracker);

        var service = new Service { Id = Guid.NewGuid(), ServiceStatus = ServiceStatus.Open, Title = "Vistoria" };
        db.Services.Add(service);
        await db.SaveChangesAsync();

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
        var fakeOpp = new FakeOpportunityService();
        var controller = new ServicesController(fakeOpp, db, fakeTracker);

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

        var actionResult = await controller.GetById(service.Id);
        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        dynamic data = okResult.Value!;

        Assert.Equal(service.Id, (Guid)data.id);
        Assert.Equal("Troca de Chuveiro", (string)data.category);
        Assert.Equal("Mariana Silva", (string)data.clientName);
        Assert.Equal("(11) 98888-7777", (string)data.clientPhone);
        Assert.Equal(180m, (decimal)data.price);
        Assert.Equal("Endereço cadastrado", (string)data.address);
        Assert.NotNull(data.professional);
        Assert.Equal("Carlos Técnico", (string)data.professional.name);
    }
}
