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

namespace WorkEz.WebUID.Tests;

public class UrgencyAndRoadmapPhase1Tests
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
        public Task<Result<IEnumerable<OpportunityCallDto>>> GetOpportunitiesAsync(Guid providerUserId) =>
            Task.FromResult(Result<IEnumerable<OpportunityCallDto>>.Success(Enumerable.Empty<OpportunityCallDto>()));
    }

    private static AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static ServicesController CreateController(AppDbContext db, FakeTrackingNotificationService? fakeTracker = null)
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
            [new Claim("sub", userId.ToString()), new Claim("role", role), new Claim(ClaimTypes.Role, role)],
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
    public async Task CreateService_WithEmergencyUrgency_PersistsAndReturnsUrgencyLevel()
    {
        using var db = CreateInMemoryDbContext();
        var controller = CreateController(db);

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente SOS", Role = UserRole.Customer };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id };
        db.Users.Add(customerUser);
        db.Customers.Add(customer);
        await db.SaveChangesAsync();

        Authenticate(controller, customerUser.Id, "Customer");

        var request = new CreateServiceRequest
        {
            Title = "Encanamento Emergencial",
            Description = "Cano estourado inundando a cozinha",
            UrgencyLevel = "Emergency",
            Address = new CreateAddressDto
            {
                Street = "Rua Augusta",
                Number = "500",
                Neighborhood = "Consolação",
                City = "São Paulo",
                State = "SP",
                ZipCode = "01304-000",
                Latitude = -23.55,
                Longitude = -46.65
            }
        };

        var result = await controller.CreateService(customer.Id, request);
        var okResult = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<ServiceDetailDto>(okResult.Value);

        Assert.Equal("Emergency", dto.UrgencyLevel);

        var savedService = await db.Services.FirstOrDefaultAsync(s => s.Id == dto.Id);
        Assert.NotNull(savedService);
        Assert.Equal("Emergency", savedService.UrgencyLevel);
    }

    [Fact]
    public async Task CreateService_WithNormalUrgency_PersistsAndReturnsUrgencyLevel()
    {
        using var db = CreateInMemoryDbContext();
        var controller = CreateController(db);

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente Normal", Role = UserRole.Customer };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id };
        db.Users.Add(customerUser);
        db.Customers.Add(customer);
        await db.SaveChangesAsync();

        Authenticate(controller, customerUser.Id, "Customer");

        var request = new CreateServiceRequest
        {
            Title = "Pintura Residencial",
            Description = "Pintar quarto no fim de semana",
            UrgencyLevel = "Normal",
            Address = new CreateAddressDto
            {
                Street = "Av. Paulista",
                Number = "1000",
                Neighborhood = "Bela Vista",
                City = "São Paulo",
                State = "SP",
                ZipCode = "01310-100",
                Latitude = -23.56,
                Longitude = -46.65
            }
        };

        var result = await controller.CreateService(customer.Id, request);
        var okResult = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<ServiceDetailDto>(okResult.Value);

        Assert.Equal("Normal", dto.UrgencyLevel);

        var savedService = await db.Services.FirstOrDefaultAsync(s => s.Id == dto.Id);
        Assert.NotNull(savedService);
        Assert.Equal("Normal", savedService.UrgencyLevel);
    }

    [Fact]
    public async Task CreateService_WithoutUrgencyLevel_DefaultsGracefully()
    {
        using var db = CreateInMemoryDbContext();
        var controller = CreateController(db);

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente Padrão", Role = UserRole.Customer };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id };
        db.Users.Add(customerUser);
        db.Customers.Add(customer);
        await db.SaveChangesAsync();

        Authenticate(controller, customerUser.Id, "Customer");

        var request = new CreateServiceRequest
        {
            Title = "Serviço Geral",
            Description = "Manutenção preventiva",
            UrgencyLevel = null,
            Address = new CreateAddressDto
            {
                Street = "Rua Oscar Freire",
                Number = "200",
                Neighborhood = "Jardins",
                City = "São Paulo",
                State = "SP",
                ZipCode = "01426-000",
                Latitude = -23.56,
                Longitude = -46.66
            }
        };

        var result = await controller.CreateService(customer.Id, request);
        var okResult = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<ServiceDetailDto>(okResult.Value);

        Assert.Equal("Medium", dto.UrgencyLevel);
    }

    [Fact]
    public async Task GetById_ReturnsServiceDetailWithMappedUrgencyLevel()
    {
        using var db = CreateInMemoryDbContext();
        var controller = CreateController(db);

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente Consulta", Role = UserRole.Customer };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id };
        var address = new Address
        {
            Id = Guid.NewGuid(),
            Street = "Rua Teste",
            Number = "123",
            Neighborhood = "Bairro",
            City = "Cidade",
            State = "SP",
            ZipCode = "01234-567",
            Latitude = -23.0,
            Longitude = -46.0
        };
        var service = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Customer = customer,
            AddressId = address.Id,
            Address = address,
            Title = "Eletricista SOS",
            Description = "Quadro de luz desarmando",
            UrgencyLevel = "Emergency",
            ServiceStatus = ServiceStatus.Open,
            CreatedAt = DateTime.UtcNow
        };

        db.Users.Add(customerUser);
        db.Customers.Add(customer);
        db.Addresses.Add(address);
        db.Services.Add(service);
        await db.SaveChangesAsync();

        Authenticate(controller, customerUser.Id, "Customer");

        var result = await controller.GetById(service.Id);
        var okResult = Assert.IsType<OkObjectResult>(result);
        var detailDto = Assert.IsType<ServiceDetailDto>(okResult.Value);

        Assert.Equal("Emergency", detailDto.UrgencyLevel);
    }
}
