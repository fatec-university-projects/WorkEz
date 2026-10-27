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

public class CategoriesAndProvidersControllerTests
{
    private static AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static void Authenticate(ControllerBase controller, Guid? userId, string role = "ServiceProvider")
    {
        var httpContext = new DefaultHttpContext();
        if (userId.HasValue)
        {
            var identity = new ClaimsIdentity(
                [new Claim("sub", userId.Value.ToString()), new Claim(ClaimTypes.Role, role), new Claim("role", role)],
                "TestAuth");
            httpContext.User = new ClaimsPrincipal(identity);
        }
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
    }

    [Fact]
    public async Task CategoriesController_GetAll_ShouldReturnCategoriesOrderedByName()
    {
        using var db = CreateInMemoryDbContext();
        db.Categories.AddRange(
            new Category { Id = Guid.NewGuid(), Name = "Pintura", Description = "Pintura residencial" },
            new Category { Id = Guid.NewGuid(), Name = "Alvenaria", Description = "Construção e reformas" },
            new Category { Id = Guid.NewGuid(), Name = "Elétrica", Description = "Instalações elétricas" }
        );
        await db.SaveChangesAsync();

        var catService = new CategoryApplicationService(new CategoryRepository(db), new ServiceProviderRepository(db));
        var controller = new CategoriesController(catService);

        var res = await controller.GetAll();
        var list = Assert.IsAssignableFrom<IEnumerable<CategoryDto>>(Assert.IsType<OkObjectResult>(res).Value).ToList();

        Assert.Equal(3, list.Count);
        Assert.Equal("Alvenaria", list[0].Name);
        Assert.Equal("Elétrica", list[1].Name);
        Assert.Equal("Pintura", list[2].Name);
    }

    [Fact]
    public async Task ProviderCategoriesController_UpdateCategories_ShouldReplaceCategories_AndEnforceOwnership()
    {
        using var db = CreateInMemoryDbContext();

        var cat1 = new Category { Id = Guid.NewGuid(), Name = "Elétrica" };
        var cat2 = new Category { Id = Guid.NewGuid(), Name = "Hidráulica" };
        var cat3 = new Category { Id = Guid.NewGuid(), Name = "Pintura" };

        var provUser = new User { Id = Guid.NewGuid(), Name = "Prestador Dono", Role = UserRole.ServiceProvider };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = provUser.Id, User = provUser };

        db.Categories.AddRange(cat1, cat2, cat3);
        db.Users.Add(provUser);
        db.Providers.Add(provider);
        await db.SaveChangesAsync();

        var catService = new CategoryApplicationService(new CategoryRepository(db), new ServiceProviderRepository(db));
        var controller = new ProviderCategoriesController(catService);

        // Terceiro tentando alterar categorias do prestador -> 403 Forbid
        Authenticate(controller, Guid.NewGuid(), "ServiceProvider");
        var forbidRes = await controller.UpdateCategories(provider.Id, [cat1.Id, cat2.Id]);
        Assert.IsType<ForbidResult>(forbidRes);

        // Próprio prestador vincula cat1 e cat2
        Authenticate(controller, provUser.Id, "ServiceProvider");
        var ok1 = await controller.UpdateCategories(provider.Id, [cat1.Id, cat2.Id]);
        Assert.IsType<OkObjectResult>(ok1);

        var currentCats = Assert.IsAssignableFrom<IEnumerable<CategoryDto>>(
            Assert.IsType<OkObjectResult>(await controller.GetByProvider(provider.Id)).Value).ToList();
        Assert.Equal(2, currentCats.Count);

        // Substitui apenas por cat3
        await controller.UpdateCategories(provider.Id, [cat3.Id]);
        var replacedCats = Assert.IsAssignableFrom<IEnumerable<CategoryDto>>(
            Assert.IsType<OkObjectResult>(await controller.GetByProvider(provider.Id)).Value).ToList();
        var single = Assert.Single(replacedCats);
        Assert.Equal("Pintura", single.Name);
    }

    [Fact]
    public async Task ServiceProvidersController_UpdateProvider_And_UpdateLocation_ShouldEnforceOwnershipAndValidateCoordinates()
    {
        using var db = CreateInMemoryDbContext();

        var provUser = new User { Id = Guid.NewGuid(), Name = "Daniel", Email = "daniel@test.com", Role = UserRole.ServiceProvider };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = provUser.Id, User = provUser };
        db.Users.Add(provUser);
        db.Providers.Add(provider);
        await db.SaveChangesAsync();

        var portfolioService = new PortfolioApplicationService(new ServiceProviderRepository(db));
        var controller = new ServiceProvidersController(portfolioService);

        // Terceiro tentando atualizar descrição ou localização -> 403 Forbid
        Authenticate(controller, Guid.NewGuid(), "ServiceProvider");
        Assert.IsType<ForbidResult>(await controller.UpdateProvider(provider.Id, new UpdateProviderRequest("Invasão")));
        Assert.IsType<ForbidResult>(await controller.UpdateLocation(provider.Id, new UpdateProviderLocationRequest(-23.5, -46.6, 15)));

        // Dono autenticado atualiza descrição e localização válida
        Authenticate(controller, provUser.Id, "ServiceProvider");
        var updateDescRes = await controller.UpdateProvider(provider.Id, new UpdateProviderRequest("Especialista em reparos residenciais"));
        var descDto = Assert.IsType<ServiceProviderProfileDto>(Assert.IsType<OkObjectResult>(updateDescRes).Value);
        Assert.Equal("Especialista em reparos residenciais", descDto.ProfessionalDescription);

        var updateLocRes = await controller.UpdateLocation(provider.Id, new UpdateProviderLocationRequest(-23.5505, -46.6333, 20.0));
        var locDto = Assert.IsType<ServiceProviderProfileDto>(Assert.IsType<OkObjectResult>(updateLocRes).Value);
        Assert.Equal(-23.5505, locDto.Latitude);
        Assert.Equal(-46.6333, locDto.Longitude);
        Assert.Equal(20.0, locDto.ServiceRadiusKm);

        // Coordenadas fora dos limites geográficos (-90..90, -180..180) -> 400 BadRequest
        var badLat = await controller.UpdateLocation(provider.Id, new UpdateProviderLocationRequest(95.0, -46.6333, 15.0));
        var badLon = await controller.UpdateLocation(provider.Id, new UpdateProviderLocationRequest(-23.5505, -195.0, 15.0));
        Assert.IsType<BadRequestObjectResult>(badLat);
        Assert.IsType<BadRequestObjectResult>(badLon);
    }

    [Fact]
    public async Task ServiceProvidersController_GetNearby_ShouldReturnProvidersWithinRadiusOrderedByHaversineDistance()
    {
        using var db = CreateInMemoryDbContext();

        // Ponto base: Av. Paulista, São Paulo (-23.5614, -46.6559)
        var userClose = new User { Id = Guid.NewGuid(), Name = "Perto (Pinheiros)", Email = "p1@test.com", Role = UserRole.ServiceProvider };
        var provClose = new ServiceProviderEntity
        {
            Id = Guid.NewGuid(),
            UserId = userClose.Id,
            User = userClose,
            Latitude = -23.5670,
            Longitude = -46.6900, // ~3.5 km
            ServiceRadiusKm = 15.0,
            AverageRating = 4.9m
        };

        var userMedium = new User { Id = Guid.NewGuid(), Name = "Médio (Guarulhos)", Email = "p2@test.com", Role = UserRole.ServiceProvider };
        var provMedium = new ServiceProviderEntity
        {
            Id = Guid.NewGuid(),
            UserId = userMedium.Id,
            User = userMedium,
            Latitude = -23.4628,
            Longitude = -46.5333, // ~16.6 km
            ServiceRadiusKm = 25.0,
            AverageRating = 4.7m
        };

        var userFar = new User { Id = Guid.NewGuid(), Name = "Longe (Campinas)", Email = "p3@test.com", Role = UserRole.ServiceProvider };
        var provFar = new ServiceProviderEntity
        {
            Id = Guid.NewGuid(),
            UserId = userFar.Id,
            User = userFar,
            Latitude = -22.9099,
            Longitude = -47.0626, // ~83 km
            ServiceRadiusKm = 20.0,
            AverageRating = 5.0m
        };

        db.Users.AddRange(userClose, userMedium, userFar);
        db.Providers.AddRange(provClose, provMedium, provFar);
        await db.SaveChangesAsync();

        var portfolioService = new PortfolioApplicationService(new ServiceProviderRepository(db));
        var controller = new ServiceProvidersController(portfolioService);
        Authenticate(controller, Guid.NewGuid(), "Customer");

        // Busca num raio de 30 km a partir da Av. Paulista
        var nearbyRes = await controller.GetNearby(-23.5614, -46.6559, radiusKm: 30.0);
        var list = Assert.IsAssignableFrom<IEnumerable<NearbyProviderDto>>(
            Assert.IsType<OkObjectResult>(nearbyRes).Value).ToList();

        Assert.Equal(2, list.Count);
        Assert.Equal("Perto (Pinheiros)", list[0].Name);
        Assert.Equal("Médio (Guarulhos)", list[1].Name);
        Assert.True(list[0].DistanceKm < list[1].DistanceKm);
    }
}
