using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Xunit;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Infra.Data.Context;
using WorkEz.Infra.Data.Repositories;
using WorkEz.WebUID.Auth;
using WorkEz.WebUID.Controllers;
using ServiceProviderEntity = WorkEz.Domain.Entities.ServiceProvider;

namespace WorkEz.WebUID.Tests;

public class AuthAndTokenFlowTests
{
    private static AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static TokenService CreateTokenService()
    {
        var jwtOptions = Options.Create(new JwtOptions
        {
            Issuer = "WorkEzTest",
            Audience = "WorkEzClientTest",
            SecretKey = "SuperSecretTestKeyForWorkEzJwtValidation2026!@#",
            AccessTokenExpirationMinutes = 15,
            RefreshTokenExpirationDays = 7
        });
        return new TokenService(jwtOptions);
    }

    private static (AuthApplicationService service, AuthController controller) CreateAuthStack(AppDbContext db)
    {
        var userRepo = new UserRepository(db);
        var customerRepo = new BaseRepository<Customer>(db);
        var providerRepo = new BaseRepository<ServiceProviderEntity>(db);
        var refreshRepo = new RefreshTokenRepository(db);
        var tokenService = CreateTokenService();
        var passwordHasher = new PasswordHasher();

        var authService = new AuthApplicationService(
            userRepo,
            customerRepo,
            providerRepo,
            refreshRepo,
            tokenService,
            passwordHasher
        );

        var controller = new AuthController(authService);
        return (authService, controller);
    }

    [Fact]
    public async Task RegisterCustomer_And_RegisterProvider_ShouldNormalizeEmail_SanitizeDocument_AndCreateProfiles()
    {
        using var db = CreateInMemoryDbContext();
        var (_, controller) = CreateAuthStack(db);

        var custReq = new RegisterCustomerRequest(
            Name: "  Carlos Silva  ",
            Email: "  CARLOS.SILVA@Example.COM ",
            Password: "Password123",
            Phone: " (11) 98888-1111 "
        );

        var custAction = await controller.RegisterCustomer(custReq);
        var createdCust = Assert.IsType<CreatedResult>(custAction);
        var custResp = Assert.IsType<RegisterResponse>(createdCust.Value);

        Assert.Equal("Carlos Silva", custResp.Name);
        Assert.Equal("carlos.silva@example.com", custResp.Email);
        Assert.Equal("Customer", custResp.Role);
        Assert.True(await db.Customers.AnyAsync(c => c.UserId == custResp.Id));

        var provReq = new RegisterProviderRequest(
            Name: "Ana Técnica",
            Email: "ANA@Example.com",
            Password: "Password123",
            Phone: "11977772222",
            DocumentNumber: "123.456.789-01"
        );

        var provAction = await controller.RegisterProvider(provReq);
        var createdProv = Assert.IsType<CreatedResult>(provAction);
        var provResp = Assert.IsType<RegisterResponse>(createdProv.Value);

        Assert.Equal("ServiceProvider", provResp.Role);
        var savedProviderUser = await db.Users.FindAsync(provResp.Id);
        Assert.Equal("12345678901", savedProviderUser!.DocumentNumber);
        Assert.True(await db.Providers.AnyAsync(p => p.UserId == provResp.Id));
    }

    [Fact]
    public async Task Register_DuplicateEmail_ShouldReturn409Conflict_AndInvalidFieldsShouldReturn400()
    {
        using var db = CreateInMemoryDbContext();
        var (_, controller) = CreateAuthStack(db);

        await controller.RegisterCustomer(new RegisterCustomerRequest("User 1", "dup@test.com", "123456", null));

        var dupResult = await controller.RegisterProvider(new RegisterProviderRequest("User 2", "  DUP@test.com ", "123456", null, null));
        Assert.IsType<ConflictObjectResult>(dupResult);

        var emptyName = await controller.RegisterCustomer(new RegisterCustomerRequest("   ", "valid@test.com", "123456", null));
        Assert.IsType<BadRequestObjectResult>(emptyName);

        var invalidEmail = await controller.RegisterCustomer(new RegisterCustomerRequest("Nome", "email-invalido", "123456", null));
        Assert.IsType<BadRequestObjectResult>(invalidEmail);

        var shortPassword = await controller.RegisterCustomer(new RegisterCustomerRequest("Nome", "valid2@test.com", "12345", null));
        Assert.IsType<BadRequestObjectResult>(shortPassword);
    }

    [Fact]
    public async Task Login_ValidCredentials_ShouldReturnValidJwtWithShortClaims_AndInvalidShouldReturn400()
    {
        using var db = CreateInMemoryDbContext();
        var (_, controller) = CreateAuthStack(db);

        var reg = await controller.RegisterProvider(new RegisterProviderRequest("Roberto", "roberto@workez.com", "SenhaForte99", "11999990000", "11122233344"));
        var regDto = Assert.IsType<RegisterResponse>(Assert.IsType<CreatedResult>(reg).Value);

        var loginOk = await controller.Login(new LoginRequest("  ROBERTO@workez.com ", "SenhaForte99"));
        var okObj = Assert.IsType<OkObjectResult>(loginOk);
        var tokenResp = Assert.IsType<TokenResponse>(okObj.Value);

        Assert.False(string.IsNullOrWhiteSpace(tokenResp.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(tokenResp.RefreshToken));
        Assert.Equal(900, tokenResp.ExpiresIn);

        var handler = new JsonWebTokenHandler();
        var jwt = handler.ReadJsonWebToken(tokenResp.AccessToken);
        Assert.Equal(regDto.Id.ToString(), jwt.GetClaim("sub").Value);
        Assert.Equal("Roberto", jwt.GetClaim("name").Value);
        Assert.Equal("roberto@workez.com", jwt.GetClaim("email").Value);
        Assert.Equal("ServiceProvider", jwt.GetClaim("role").Value);

        // Senha incorreta ou email inexistente -> 400 BadRequest
        var wrongPass = await controller.Login(new LoginRequest("roberto@workez.com", "SenhaErrada"));
        Assert.IsType<BadRequestObjectResult>(wrongPass);

        var unknownEmail = await controller.Login(new LoginRequest("naoexiste@workez.com", "SenhaForte99"));
        Assert.IsType<BadRequestObjectResult>(unknownEmail);
    }

    [Fact]
    public async Task RefreshTokenRotation_ShouldIssueNewPair_RevokeOldToken_AndRejectReplayAttack()
    {
        using var db = CreateInMemoryDbContext();
        var (_, controller) = CreateAuthStack(db);

        await controller.RegisterCustomer(new RegisterCustomerRequest("Julia", "julia@workez.com", "123456", null));
        var loginRes = Assert.IsType<OkObjectResult>(await controller.Login(new LoginRequest("julia@workez.com", "123456")));
        var firstTokens = Assert.IsType<TokenResponse>(loginRes.Value);

        // 1ª rotação com o refresh token original -> 200 OK com novo par
        var refreshRes = await controller.Refresh(new RefreshRequest(firstTokens.RefreshToken));
        var okRefresh = Assert.IsType<OkObjectResult>(refreshRes);
        var secondTokens = Assert.IsType<TokenResponse>(okRefresh.Value);

        Assert.NotEqual(firstTokens.RefreshToken, secondTokens.RefreshToken);

        // Tentativa de replay com o primeiro refresh token (já revogado) -> 401 Unauthorized
        var replayAttempt = await controller.Refresh(new RefreshRequest(firstTokens.RefreshToken));
        Assert.IsType<UnauthorizedObjectResult>(replayAttempt);

        // O segundo refresh token continua válido
        var secondRefresh = await controller.Refresh(new RefreshRequest(secondTokens.RefreshToken));
        Assert.IsType<OkObjectResult>(secondRefresh);
    }

    [Fact]
    public async Task Logout_ShouldRevokeRefreshToken_AndPreventSubsequentRefresh()
    {
        using var db = CreateInMemoryDbContext();
        var (_, controller) = CreateAuthStack(db);

        await controller.RegisterCustomer(new RegisterCustomerRequest("Lucas", "lucas@workez.com", "123456", null));
        var loginRes = Assert.IsType<OkObjectResult>(await controller.Login(new LoginRequest("lucas@workez.com", "123456")));
        var tokens = Assert.IsType<TokenResponse>(loginRes.Value);

        var logoutRes = await controller.Logout(new RefreshRequest(tokens.RefreshToken));
        Assert.IsType<NoContentResult>(logoutRes);

        var refreshAfterLogout = await controller.Refresh(new RefreshRequest(tokens.RefreshToken));
        Assert.IsType<UnauthorizedObjectResult>(refreshAfterLogout);
    }

    [Fact]
    public async Task TokenService_Hash_ShouldBeDeterministicSha256Hex()
    {
        var hash1 = TokenService.Hash("token-secreto-123");
        var hash2 = TokenService.Hash("token-secreto-123");
        var hashDiff = TokenService.Hash("token-secreto-456");

        Assert.Equal(hash1, hash2);
        Assert.NotEqual(hash1, hashDiff);
        Assert.Equal(64, hash1.Length);
    }

    [Fact]
    public async Task ResourceAccess_And_CurrentUserExtensions_ShouldVerifyOwnershipAndParticipationAccurately()
    {
        using var db = CreateInMemoryDbContext();

        var custUser = new User { Id = Guid.NewGuid(), Name = "Cliente", Email = "c@test.com", Role = UserRole.Customer };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = custUser.Id, User = custUser };

        var provUser = new User { Id = Guid.NewGuid(), Name = "Prestador", Email = "p@test.com", Role = UserRole.ServiceProvider };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = provUser.Id, User = provUser };

        var outsiderUser = new User { Id = Guid.NewGuid(), Name = "Intruso", Email = "i@test.com", Role = UserRole.Customer };

        var service = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, Customer = customer, Title = "Pintura" };
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
        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            Service = service,
            ProposalId = proposal.Id,
            Proposal = proposal,
            CustomerId = customer.Id,
            Customer = customer,
            ProviderId = provider.Id,
            Provider = provider,
            FinalPrice = 200m
        };

        db.Users.AddRange(custUser, provUser, outsiderUser);
        db.Customers.Add(customer);
        db.Providers.Add(provider);
        db.Services.Add(service);
        db.Proposals.Add(proposal);
        db.Appointments.Add(appointment);
        await db.SaveChangesAsync();

        // Posse de Customer e Provider
        Assert.True(await db.OwnsCustomerAsync(customer.Id, custUser.Id));
        Assert.False(await db.OwnsCustomerAsync(customer.Id, outsiderUser.Id));
        Assert.True(await db.OwnsProviderAsync(provider.Id, provUser.Id));
        Assert.False(await db.OwnsProviderAsync(provider.Id, outsiderUser.Id));

        // Participação no Serviço
        Assert.True(await db.IsServiceCustomerAsync(service.Id, custUser.Id));
        Assert.True(await db.IsServiceProviderAsync(service.Id, provUser.Id));
        Assert.True(await db.IsAssignedProviderAsync(service.Id, provUser.Id));
        Assert.True(await db.IsServiceParticipantAsync(service.Id, custUser.Id));
        Assert.True(await db.IsServiceParticipantAsync(service.Id, provUser.Id));
        Assert.False(await db.IsServiceParticipantAsync(service.Id, outsiderUser.Id));

        // Participação na Proposta
        Assert.True(await db.IsProposalCustomerAsync(proposal.Id, custUser.Id));
        Assert.True(await db.IsProposalProviderAsync(proposal.Id, provUser.Id));
        Assert.True(await db.IsProposalParticipantAsync(proposal.Id, custUser.Id));
        Assert.True(await db.IsProposalParticipantAsync(proposal.Id, provUser.Id));
        Assert.False(await db.IsProposalParticipantAsync(proposal.Id, outsiderUser.Id));

        // CurrentUserExtensions
        var adminPrincipal = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim("sub", custUser.Id.ToString()), new Claim(ClaimTypes.Role, "Admin")], "TestAuth"));
        Assert.Equal(custUser.Id, adminPrincipal.GetUserId());
        Assert.True(adminPrincipal.IsAdmin());
    }
}
