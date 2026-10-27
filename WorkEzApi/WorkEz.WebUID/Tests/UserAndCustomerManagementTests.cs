using System.Security.Claims;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Xunit;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Infra.Data.Context;
using WorkEz.Infra.Data.Repositories;
using WorkEz.WebUID.Controllers;

namespace WorkEz.WebUID.Tests;

public class UserAndCustomerManagementTests
{
    private class FakeWebHostEnvironment : IWebHostEnvironment
    {
        public string WebRootPath { get; set; } = Path.Combine(Path.GetTempPath(), "workez_test_wwwroot_" + Guid.NewGuid().ToString("N"));
        public IFileProvider WebRootFileProvider { get; set; } = null!;
        public string ApplicationName { get; set; } = "WorkEz.Tests";
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
        public string ContentRootPath { get; set; } = Path.GetTempPath();
        public string EnvironmentName { get; set; } = "Development";
    }

    private static AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static void Authenticate(ControllerBase controller, Guid? userId, string role = "Customer")
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Scheme = "https";
        httpContext.Request.Host = new HostString("api.workez.test");

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
    public async Task UsersController_GetProfile_And_UpdateProfile_WithBase64Avatar_ShouldPersistAndRejectDuplicateEmail()
    {
        using var db = CreateInMemoryDbContext();
        var env = new FakeWebHostEnvironment();

        try
        {
            var user1 = new User { Id = Guid.NewGuid(), Name = "Beatriz", Email = "bia@workez.com", Phone = "11911112222", Role = UserRole.Customer };
            var user2 = new User { Id = Guid.NewGuid(), Name = "Outro", Email = "outro@workez.com", Role = UserRole.Customer };
            db.Users.AddRange(user1, user2);
            await db.SaveChangesAsync();

            var userService = new UserApplicationService(new UserRepository(db));
            var controller = new UsersController(userService, env);

            Authenticate(controller, user1.Id);

            // GetProfile
            var profileRes = await controller.GetProfile();
            var profileDto = Assert.IsType<UserProfileDto>(Assert.IsType<OkObjectResult>(profileRes).Value);
            Assert.Equal("Beatriz", profileDto.Name);
            Assert.Equal("bia@workez.com", profileDto.Email);

            // UpdateProfile com imagem PNG 1x1 em Base64
            const string png1x1Base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
            var updateReq = new UpdateUserProfileRequest("Beatriz Atualizada", "BIA.NOVA@workez.com", "11933334444", png1x1Base64);

            var updateRes = await controller.UpdateProfile(updateReq);
            var updatedDto = Assert.IsType<UserProfileDto>(Assert.IsType<OkObjectResult>(updateRes).Value);

            Assert.Equal("Beatriz Atualizada", updatedDto.Name);
            Assert.Equal("bia.nova@workez.com", updatedDto.Email);
            Assert.Equal("11933334444", updatedDto.Phone);
            Assert.NotNull(updatedDto.ProfilePicture);
            Assert.StartsWith("https://api.workez.test/uploads/", updatedDto.ProfilePicture!);
            Assert.EndsWith(".png", updatedDto.ProfilePicture!);

            // Tentativa de trocar e-mail para o de outra conta existente -> 400 BadRequest
            var conflictUpdate = await controller.UpdateProfile(new UpdateUserProfileRequest("Beatriz", "outro@workez.com", null, null));
            Assert.IsType<BadRequestObjectResult>(conflictUpdate);
        }
        finally
        {
            if (Directory.Exists(env.WebRootPath))
                Directory.Delete(env.WebRootPath, recursive: true);
        }
    }

    [Fact]
    public async Task UsersController_GetById_ShouldMaskContactDetailsForThirdParties_AndExposeToOwnerOrAdmin()
    {
        using var db = CreateInMemoryDbContext();
        var env = new FakeWebHostEnvironment();

        var targetUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Rafael",
            Email = "rafael.privado@workez.com",
            Phone = "11988887777",
            ProfilePicture = "https://img.com/rafael.jpg",
            Role = UserRole.ServiceProvider
        };
        db.Users.Add(targetUser);
        await db.SaveChangesAsync();

        var userService = new UserApplicationService(new UserRepository(db));
        var controller = new UsersController(userService, env);

        // Terceiro consultando -> Email e Phone ocultados
        Authenticate(controller, Guid.NewGuid(), "Customer");
        var strangerRes = await controller.GetById(targetUser.Id);
        var strangerView = Assert.IsType<UserProfileDto>(Assert.IsType<OkObjectResult>(strangerRes).Value);
        Assert.Equal("Rafael", strangerView.Name);
        Assert.Equal(string.Empty, strangerView.Email);
        Assert.Null(strangerView.Phone);

        // Próprio dono consultando -> Email e Phone visíveis
        Authenticate(controller, targetUser.Id, "ServiceProvider");
        var ownerRes = await controller.GetById(targetUser.Id);
        var ownerView = Assert.IsType<UserProfileDto>(Assert.IsType<OkObjectResult>(ownerRes).Value);
        Assert.Equal("rafael.privado@workez.com", ownerView.Email);
        Assert.Equal("11988887777", ownerView.Phone);

        // Admin consultando -> Email e Phone visíveis
        Authenticate(controller, Guid.NewGuid(), "Admin");
        var adminRes = await controller.GetById(targetUser.Id);
        var adminView = Assert.IsType<UserProfileDto>(Assert.IsType<OkObjectResult>(adminRes).Value);
        Assert.Equal("rafael.privado@workez.com", adminView.Email);
    }

    [Fact]
    public async Task CustomersController_GetByUserId_ShouldAutoProvisionCustomerIfMissing_AndBlockOtherUsers()
    {
        using var db = CreateInMemoryDbContext();

        var userWithoutCustomerRow = new User
        {
            Id = Guid.NewGuid(),
            Name = "Camila",
            Email = "camila@workez.com",
            Phone = "21999998888",
            Role = UserRole.Customer
        };
        db.Users.Add(userWithoutCustomerRow);
        await db.SaveChangesAsync();

        var customerService = new CustomerApplicationService(new CustomerRepository(db), new BaseRepository<User>(db));
        var controller = new CustomersController(customerService);

        // Terceiro tentando consultar GetByUserId de Camila -> 403 Forbid
        Authenticate(controller, Guid.NewGuid(), "Customer");
        var forbidRes = await controller.GetByUserId(userWithoutCustomerRow.Id);
        Assert.IsType<ForbidResult>(forbidRes);

        // Camila consulta seu próprio GetByUserId -> cria registro Customer automaticamente
        Authenticate(controller, userWithoutCustomerRow.Id, "Customer");
        var okRes = await controller.GetByUserId(userWithoutCustomerRow.Id);
        var dto = Assert.IsType<CustomerProfileDto>(Assert.IsType<OkObjectResult>(okRes).Value);

        Assert.Equal(userWithoutCustomerRow.Id, dto.UserId);
        Assert.Equal("Camila", dto.Name);
        Assert.Equal("camila@workez.com", dto.Email);
        Assert.True(await db.Customers.AnyAsync(c => c.UserId == userWithoutCustomerRow.Id));

        // GetById consultado por terceiro deve mascarar Email, Phone e Notes
        Authenticate(controller, Guid.NewGuid(), "ServiceProvider");
        var byIdStranger = await controller.GetById(dto.Id);
        var maskedCustomer = Assert.IsType<CustomerProfileDto>(Assert.IsType<OkObjectResult>(byIdStranger).Value);
        Assert.Equal("Camila", maskedCustomer.Name);
        Assert.Equal("", maskedCustomer.Email);
        Assert.Null(maskedCustomer.Phone);
        Assert.Null(maskedCustomer.Notes);
    }
}
