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

public class ServiceSecurityFlowTests
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
        public Task<Result<IEnumerable<OpportunityCallDto>>> GetOpportunitiesAsync(Guid providerUserId)
        {
            return Task.FromResult(Result<IEnumerable<OpportunityCallDto>>.Success(Enumerable.Empty<OpportunityCallDto>()));
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
        FakeTrackingNotificationService? fakeTracker = null)
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

        return new ServicesController(new FakeOpportunityService(), serviceAppService);
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

    private static async Task<(User customerUser, Customer customer, User providerUser, ServiceProviderEntity provider, Service service, Appointment appointment)> SeedAcceptedScenarioAsync(AppDbContext db, string checkInCode = "7492")
    {
        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente Teste", Email = "cliente@teste.com" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };

        var providerUser = new User { Id = Guid.NewGuid(), Name = "Prestador Teste", Email = "prestador@teste.com" };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = providerUser.Id, User = providerUser };

        var service = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Customer = customer,
            Title = "Conserto Elétrico",
            Description = "Troca de disjuntor e fiação",
            ServiceStatus = ServiceStatus.OnTheWay,
            StartCheckInCode = checkInCode,
            CreatedAt = DateTime.UtcNow
        };

        var proposal = new Proposal
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            ProviderId = provider.Id,
            ProposedPrice = 250m,
            ProposalStatus = ProposalStatus.Accepted
        };

        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            ProposalId = proposal.Id,
            CustomerId = customer.Id,
            ProviderId = provider.Id,
            Provider = provider,
            AppointmentStatus = AppointmentStatus.InProgress,
            FinalPrice = 250m,
            ConfirmationCode = checkInCode,
            ScheduledDate = DateTime.UtcNow
        };

        db.Users.AddRange(customerUser, providerUser);
        db.Customers.Add(customer);
        db.Providers.Add(provider);
        db.Services.Add(service);
        db.Proposals.Add(proposal);
        db.Appointments.Add(appointment);
        await db.SaveChangesAsync();

        return (customerUser, customer, providerUser, provider, service, appointment);
    }

    [Fact]
    public async Task ValidateCheckIn_WithValidCode_ShouldChangeStatusToInProgress()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var fakeTracker = new FakeTrackingNotificationService();
        var controller = CreateController(db, fakeTracker);
        var (_, _, providerUser, _, service, _) = await SeedAcceptedScenarioAsync(db, "8319");
        Authenticate(controller, providerUser.Id, "Provider");

        // Act
        var result = await controller.ValidateCheckIn(service.Id, new ValidateCheckInRequest("8319"));

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var statusResult = Assert.IsType<ServiceStatusResultDto>(okResult.Value);
        Assert.Equal("in-progress", statusResult.Status);

        var updatedService = await db.Services.FindAsync(service.Id);
        Assert.NotNull(updatedService);
        Assert.Equal(ServiceStatus.InProgress, updatedService.ServiceStatus);

        Assert.Contains(fakeTracker.Notifications, n => n.ServiceId == service.Id && n.EventType == "status_changed");
    }

    [Fact]
    public async Task ValidateCheckIn_WithInvalidCode_ShouldReturnBadRequest()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var controller = CreateController(db);
        var (_, _, providerUser, _, service, _) = await SeedAcceptedScenarioAsync(db, "8319");
        Authenticate(controller, providerUser.Id, "Provider");

        // Act
        var result = await controller.ValidateCheckIn(service.Id, new ValidateCheckInRequest("0000"));

        // Assert
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.NotNull(badRequest.Value);

        var updatedService = await db.Services.FindAsync(service.Id);
        Assert.NotNull(updatedService);
        Assert.Equal(ServiceStatus.OnTheWay, updatedService.ServiceStatus);
    }

    [Fact]
    public async Task ValidateCheckIn_WithUnassignedUser_ShouldReturnForbidden()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var controller = CreateController(db);
        var (customerUser, _, _, _, service, _) = await SeedAcceptedScenarioAsync(db, "8319");
        Authenticate(controller, customerUser.Id, "Customer");

        // Act (Customer tentando validar check-in de prestador)
        var result = await controller.ValidateCheckIn(service.Id, new ValidateCheckInRequest("8319"));

        // Assert
        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task ValidateCheckIn_WhenAlreadyCompleted_ShouldReturnBadRequest()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var controller = CreateController(db);
        var (_, _, providerUser, _, service, _) = await SeedAcceptedScenarioAsync(db, "8319");
        service.ServiceStatus = ServiceStatus.Completed;
        await db.SaveChangesAsync();

        Authenticate(controller, providerUser.Id, "Provider");

        // Act
        var result = await controller.ValidateCheckIn(service.Id, new ValidateCheckInRequest("8319"));

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ChecklistPhotos_WithBeforePhase_ShouldPersistTimestampedBeforePhotos()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var fakeTracker = new FakeTrackingNotificationService();
        var controller = CreateController(db, fakeTracker);
        var (_, _, providerUser, _, service, _) = await SeedAcceptedScenarioAsync(db);
        Authenticate(controller, providerUser.Id, "Provider");

        var photos = new[] { "https://cdn.workez.com/before1.jpg", "https://cdn.workez.com/before2.jpg" };

        // Act
        var result = await controller.ChecklistPhotos(service.Id, new ChecklistPhotosRequest("before", photos));

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var detail = Assert.IsType<ServiceDetailDto>(okResult.Value);
        Assert.NotNull(detail.BeforePhotos);
        Assert.Equal(2, detail.BeforePhotos.Length);
        Assert.Equal("https://cdn.workez.com/before1.jpg", detail.BeforePhotos[0]);
        Assert.Equal("https://cdn.workez.com/before2.jpg", detail.BeforePhotos[1]);

        var updatedService = await db.Services.FindAsync(service.Id);
        Assert.NotNull(updatedService);
        Assert.NotNull(updatedService.BeforePhotosJson);
        Assert.Contains("before1.jpg", updatedService.BeforePhotosJson);
        Assert.Contains("timestamp", updatedService.BeforePhotosJson);
    }

    [Fact]
    public async Task ChecklistPhotos_WithAfterPhaseAndSignature_ShouldPersistTimestampedAfterPhotosAndSignature()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var fakeTracker = new FakeTrackingNotificationService();
        var controller = CreateController(db, fakeTracker);
        var (_, _, providerUser, _, service, _) = await SeedAcceptedScenarioAsync(db);
        Authenticate(controller, providerUser.Id, "Provider");

        var photos = new[] { "https://cdn.workez.com/after1.jpg", "https://cdn.workez.com/after2.jpg", "https://cdn.workez.com/after3.jpg" };
        var signature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...";

        // Act
        var result = await controller.ChecklistPhotos(service.Id, new ChecklistPhotosRequest("after", photos, signature));

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var detail = Assert.IsType<ServiceDetailDto>(okResult.Value);
        Assert.NotNull(detail.AfterPhotos);
        Assert.Equal(3, detail.AfterPhotos.Length);
        Assert.Equal(signature, detail.CompletedClientSignatureUrl);

        var updatedService = await db.Services.FindAsync(service.Id);
        Assert.NotNull(updatedService);
        Assert.NotNull(updatedService.AfterPhotosJson);
        Assert.Equal(signature, updatedService.CompletedClientSignatureUrl);
    }

    [Fact]
    public async Task ChecklistPhotos_WithInvalidPhase_ShouldReturnBadRequest()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var controller = CreateController(db);
        var (_, _, providerUser, _, service, _) = await SeedAcceptedScenarioAsync(db);
        Authenticate(controller, providerUser.Id, "Provider");

        // Act
        var result = await controller.ChecklistPhotos(service.Id, new ChecklistPhotosRequest("invalid_phase", ["https://cdn.workez.com/photo.jpg"]));

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task GetById_ForCustomer_ShouldExposeStartCheckInCode()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var controller = CreateController(db);
        var (customerUser, _, _, _, service, _) = await SeedAcceptedScenarioAsync(db, "9512");
        Authenticate(controller, customerUser.Id, "Customer");

        // Act
        var result = await controller.GetById(service.Id);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var detail = Assert.IsType<ServiceDetailDto>(okResult.Value);
        Assert.Equal("9512", detail.StartCheckInCode);
    }

    [Fact]
    public async Task GetById_ForProvider_BeforeCheckIn_ShouldHideStartCheckInCode()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var controller = CreateController(db);
        var (_, _, providerUser, _, service, _) = await SeedAcceptedScenarioAsync(db, "9512");
        service.ServiceStatus = ServiceStatus.OnTheWay;
        await db.SaveChangesAsync();

        Authenticate(controller, providerUser.Id, "Provider");

        // Act (prestador a caminho antes de validar check-in presencial)
        var result = await controller.GetById(service.Id);

        // Assert (prestador não pode ver o código antes do cliente fornecer)
        var okResult = Assert.IsType<OkObjectResult>(result);
        var detail = Assert.IsType<ServiceDetailDto>(okResult.Value);
        Assert.Null(detail.StartCheckInCode);
    }

    [Fact]
    public async Task GetById_ForProvider_AfterCheckIn_ShouldExposeStartCheckInCode()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var controller = CreateController(db);
        var (_, _, providerUser, _, service, _) = await SeedAcceptedScenarioAsync(db, "9512");
        service.ServiceStatus = ServiceStatus.InProgress;
        await db.SaveChangesAsync();

        Authenticate(controller, providerUser.Id, "Provider");

        // Act (após check-in validado)
        var result = await controller.GetById(service.Id);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var detail = Assert.IsType<ServiceDetailDto>(okResult.Value);
        Assert.Equal("9512", detail.StartCheckInCode);
    }
}
