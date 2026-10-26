using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Infra.Data.Context;
using WorkEz.Infra.Data.Repositories;
using WorkEz.WebUID.Controllers;
using ServiceProviderEntity = WorkEz.Domain.Entities.ServiceProvider;

namespace WorkEz.WebUID.Tests;

public class ReviewApplicationAndControllerTests
{
    private static AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static (ReviewApplicationService service, ReviewsController controller) CreateReviewStack(
        AppDbContext db,
        Guid? authenticatedUserId = null,
        string role = "Customer")
    {
        var reviewRepo = new ReviewRepository(db);
        var customerRepo = new CustomerRepository(db);
        var serviceRepo = new ServiceRepository(db);
        var providerRepo = new ServiceProviderRepository(db);
        var apptRepo = new AppointmentRepository(db);

        var appService = new ReviewApplicationService(reviewRepo, customerRepo, serviceRepo, providerRepo, apptRepo);
        var controller = new ReviewsController(appService);

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

        return (appService, controller);
    }

    [Fact]
    public async Task CreateReview_ByServiceId_ShouldPersistReview_AndRecalculateProviderAverageRating()
    {
        using var db = CreateInMemoryDbContext();

        var custUser1 = new User { Id = Guid.NewGuid(), Name = "Cliente 1", Email = "c1@test.com" };
        var customer1 = new Customer { Id = Guid.NewGuid(), UserId = custUser1.Id, User = custUser1 };

        var custUser2 = new User { Id = Guid.NewGuid(), Name = "Cliente 2", Email = "c2@test.com" };
        var customer2 = new Customer { Id = Guid.NewGuid(), UserId = custUser2.Id, User = custUser2 };

        var provUser = new User { Id = Guid.NewGuid(), Name = "Mestre Obras", Email = "p@test.com", Role = UserRole.ServiceProvider };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = provUser.Id, User = provUser, AverageRating = 0m, CompletedServicesCount = 0 };

        var srv1 = new Service { Id = Guid.NewGuid(), CustomerId = customer1.Id, Customer = customer1, Title = "Reforma 1", ServiceStatus = ServiceStatus.Completed };
        var appt1 = new Appointment { Id = Guid.NewGuid(), ServiceId = srv1.Id, CustomerId = customer1.Id, ProviderId = provider.Id, Provider = provider, FinalPrice = 300m };

        var srv2 = new Service { Id = Guid.NewGuid(), CustomerId = customer2.Id, Customer = customer2, Title = "Reforma 2", ServiceStatus = ServiceStatus.Completed };
        var appt2 = new Appointment { Id = Guid.NewGuid(), ServiceId = srv2.Id, CustomerId = customer2.Id, ProviderId = provider.Id, Provider = provider, FinalPrice = 400m };

        db.Users.AddRange(custUser1, custUser2, provUser);
        db.Customers.AddRange(customer1, customer2);
        db.Providers.Add(provider);
        db.Services.AddRange(srv1, srv2);
        db.Appointments.AddRange(appt1, appt2);
        await db.SaveChangesAsync();

        var (appService, _) = CreateReviewStack(db);

        // Cliente 1 avalia com nota 5
        var res1 = await appService.CreateReviewAsync(
            customer1.Id,
            new CreateReviewRequest(null, null, 5, "Excelente trabalho!", srv1.Id),
            custUser1.Id,
            isAdmin: false);
        Assert.True(res1.IsSuccess);
        Assert.False(res1.Value!.IsUpdate);

        // Cliente 2 avalia com nota 4
        var res2 = await appService.CreateReviewAsync(
            customer2.Id,
            new CreateReviewRequest(appt2.Id, null, 4, "Muito bom!", srv2.Id),
            custUser2.Id,
            isAdmin: false);
        Assert.True(res2.IsSuccess);

        var updatedProvider = await db.Providers.FindAsync(provider.Id);
        Assert.Equal(4.5m, updatedProvider!.AverageRating);
        Assert.Equal(2, updatedProvider.CompletedServicesCount);
    }

    [Fact]
    public async Task CreateReview_UpsertBehavior_SendingReviewTwiceForSameService_ShouldUpdateWithoutDuplicating()
    {
        using var db = CreateInMemoryDbContext();

        var custUser = new User { Id = Guid.NewGuid(), Name = "Cliente", Email = "c@test.com" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = custUser.Id, User = custUser };
        var provUser = new User { Id = Guid.NewGuid(), Name = "Prestador", Email = "p@test.com", Role = UserRole.ServiceProvider };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = provUser.Id, User = provUser };
        var service = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, Customer = customer, Title = "Elétrica", ServiceStatus = ServiceStatus.Completed };
        var appt = new Appointment { Id = Guid.NewGuid(), ServiceId = service.Id, CustomerId = customer.Id, ProviderId = provider.Id, Provider = provider, FinalPrice = 150m };

        db.Users.AddRange(custUser, provUser);
        db.Customers.Add(customer);
        db.Providers.Add(provider);
        db.Services.Add(service);
        db.Appointments.Add(appt);
        await db.SaveChangesAsync();

        var (appService, _) = CreateReviewStack(db);

        var first = await appService.CreateReviewAsync(
            customer.Id,
            new CreateReviewRequest(appt.Id, null, 3, "Nota inicial", service.Id),
            custUser.Id,
            isAdmin: false);

        var second = await appService.CreateReviewAsync(
            customer.Id,
            new CreateReviewRequest(appt.Id, null, 5, "Resolvido perfeitamente!", service.Id),
            custUser.Id,
            isAdmin: false);

        Assert.True(first.IsSuccess);
        Assert.False(first.Value!.IsUpdate);

        Assert.True(second.IsSuccess);
        Assert.True(second.Value!.IsUpdate);
        Assert.Equal(first.Value.Id, second.Value.Id);

        Assert.Equal(1, await db.Reviews.CountAsync());
        var updatedProvider = await db.Providers.FindAsync(provider.Id);
        Assert.Equal(5.0m, updatedProvider!.AverageRating);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(6)]
    public async Task CreateReview_InvalidRating_ShouldReturnBadRequest(int invalidRating)
    {
        using var db = CreateInMemoryDbContext();
        var custUser = new User { Id = Guid.NewGuid(), Name = "Cliente", Email = "c@test.com" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = custUser.Id, User = custUser };
        db.Users.Add(custUser);
        db.Customers.Add(customer);
        await db.SaveChangesAsync();

        var (_, controller) = CreateReviewStack(db, custUser.Id);
        var result = await controller.CreateReview(customer.Id, new CreateReviewRequest(null, Guid.NewGuid(), invalidRating, "Nota inválida"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task CreateReview_AntiIdor_CallerNotOwningCustomerOrService_ShouldReturn403Forbidden()
    {
        using var db = CreateInMemoryDbContext();

        var custUser1 = new User { Id = Guid.NewGuid(), Name = "Dono Real", Email = "c1@test.com" };
        var customer1 = new Customer { Id = Guid.NewGuid(), UserId = custUser1.Id, User = custUser1 };

        var custUser2 = new User { Id = Guid.NewGuid(), Name = "Outro Cliente", Email = "c2@test.com" };
        var customer2 = new Customer { Id = Guid.NewGuid(), UserId = custUser2.Id, User = custUser2 };

        var serviceOfCust1 = new Service { Id = Guid.NewGuid(), CustomerId = customer1.Id, Customer = customer1, Title = "Pintura" };

        db.Users.AddRange(custUser1, custUser2);
        db.Customers.AddRange(customer1, customer2);
        db.Services.Add(serviceOfCust1);
        await db.SaveChangesAsync();

        // Cliente 2 tenta avaliar passando o customerId do Cliente 1 -> 403 Forbid
        var (_, ctrlAsCust2) = CreateReviewStack(db, custUser2.Id);
        var forbid1 = await ctrlAsCust2.CreateReview(customer1.Id, new CreateReviewRequest(null, Guid.NewGuid(), 5, "Tentativa IDOR"));
        Assert.IsType<ForbidResult>(forbid1);

        // Cliente 2 tenta avaliar usando seu próprio customerId mas apontando para o ServiceId do Cliente 1 -> 403 Forbid
        var forbid2 = await ctrlAsCust2.CreateReview(customer2.Id, new CreateReviewRequest(null, Guid.NewGuid(), 1, "Sabotagem", serviceOfCust1.Id));
        Assert.IsType<ForbidResult>(forbid2);
    }

    [Fact]
    public async Task ReviewsController_QueryEndpoints_ByService_ByAppointment_And_ByUser()
    {
        using var db = CreateInMemoryDbContext();

        var custUser = new User { Id = Guid.NewGuid(), Name = "Fernanda", Email = "f@test.com", ProfilePicture = "https://img.com/f.png" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = custUser.Id, User = custUser };
        var provUser = new User { Id = Guid.NewGuid(), Name = "Marcos", Email = "m@test.com", Role = UserRole.ServiceProvider };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = provUser.Id, User = provUser };
        var service = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, Customer = customer, Title = "Limpeza" };
        var appt = new Appointment { Id = Guid.NewGuid(), ServiceId = service.Id, CustomerId = customer.Id, ProviderId = provider.Id, Provider = provider, FinalPrice = 200m };

        db.Users.AddRange(custUser, provUser);
        db.Customers.Add(customer);
        db.Providers.Add(provider);
        db.Services.Add(service);
        db.Appointments.Add(appt);
        await db.SaveChangesAsync();

        var (_, controller) = CreateReviewStack(db, custUser.Id);
        var createRes = await controller.CreateReview(customer.Id, new CreateReviewRequest(appt.Id, provUser.Id, 5, "Super pontual!", service.Id));
        Assert.IsType<OkObjectResult>(createRes);

        var byService = await controller.GetReviewByService(service.Id);
        var dtoByService = Assert.IsType<ReviewDto>(Assert.IsType<OkObjectResult>(byService).Value);
        Assert.Equal(5, dtoByService.Rating);
        Assert.Equal("Fernanda", dtoByService.ClientName);

        var byAppt = await controller.GetReviewByAppointment(appt.Id);
        var dtoByAppt = Assert.IsType<ReviewDto>(Assert.IsType<OkObjectResult>(byAppt).Value);
        Assert.Equal("Super pontual!", dtoByAppt.Comment);

        var byUser = await controller.GetReviewsByUserId(provUser.Id);
        var listByUser = Assert.IsAssignableFrom<IEnumerable<ReviewDto>>(Assert.IsType<OkObjectResult>(byUser).Value);
        Assert.Single(listByUser);

        var notFoundService = await controller.GetReviewByService(Guid.NewGuid());
        Assert.IsType<NotFoundObjectResult>(notFoundService);
    }
}
