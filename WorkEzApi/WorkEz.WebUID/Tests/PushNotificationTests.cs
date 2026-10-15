using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.Domain.Entities;
using WorkEz.Infra.Data.Context;
using WorkEz.Infra.Data.Repositories;
using WorkEz.WebUID.Controllers;
using Xunit;

namespace WorkEz.WebUID.Tests;

public class PushNotificationTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly UserDeviceTokenRepository _tokenRepository;
    private readonly PushNotificationService _pushService;
    private readonly NotificationsController _controller;

    public PushNotificationTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _tokenRepository = new UserDeviceTokenRepository(_context);
        
        var httpClient = new HttpClient();
        _pushService = new PushNotificationService(
            _tokenRepository,
            httpClient,
            NullLogger<PushNotificationService>.Instance
        );

        _controller = new NotificationsController(_pushService);
    }

    private void AuthenticateAs(Guid userId, string role = "Customer")
    {
        var identity = new ClaimsIdentity(
            [new Claim("sub", userId.ToString()), new Claim("role", role)],
            "TestAuth", "name", "role");
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
        GC.SuppressFinalize(this);
    }

    [Fact]
    public async Task RegisterDeviceToken_ShouldPersistTokenInDatabase()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new RegisterDeviceTokenRequest(userId, "ExponentPushToken[mock-test-token-123]", "android");

        // Act
        var result = await _pushService.RegisterDeviceTokenAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("ExponentPushToken[mock-test-token-123]", result.Value.ExpoPushToken);
        Assert.Equal("android", result.Value.Platform);

        var savedTokens = await _tokenRepository.GetByUserIdAsync(userId);
        Assert.Single(savedTokens);
    }

    [Fact]
    public async Task RegisterDeviceToken_WhenExistingToken_ShouldUpdateUserIdAndPlatform()
    {
        // Arrange
        var oldUser = Guid.NewGuid();
        var newUser = Guid.NewGuid();
        var tokenStr = "ExponentPushToken[shared-device-token]";

        await _pushService.RegisterDeviceTokenAsync(new RegisterDeviceTokenRequest(oldUser, tokenStr, "ios"));

        // Act
        var result = await _pushService.RegisterDeviceTokenAsync(new RegisterDeviceTokenRequest(newUser, tokenStr, "android"));

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(newUser, result.Value.UserId);
        Assert.Equal("android", result.Value.Platform);

        var tokensOldUser = await _tokenRepository.GetByUserIdAsync(oldUser);
        var tokensNewUser = await _tokenRepository.GetByUserIdAsync(newUser);

        Assert.Empty(tokensOldUser);
        Assert.Single(tokensNewUser);
    }

    [Fact]
    public async Task RemoveDeviceToken_ShouldRemoveFromDatabase()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tokenStr = "ExponentPushToken[token-to-remove]";
        await _pushService.RegisterDeviceTokenAsync(new RegisterDeviceTokenRequest(userId, tokenStr, "ios"));

        // Act
        var removeResult = await _pushService.RemoveDeviceTokenAsync(tokenStr);

        // Assert
        Assert.True(removeResult.IsSuccess);
        var remainingTokens = await _tokenRepository.GetByUserIdAsync(userId);
        Assert.Empty(remainingTokens);
    }

    [Fact]
    public async Task SendToUser_WithSimulatedToken_ShouldReturnTrueAndLog()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var simToken = "SimulatedLocalToken-456";
        await _pushService.RegisterDeviceTokenAsync(new RegisterDeviceTokenRequest(userId, simToken, "web"));

        // Act
        var sent = await _pushService.SendToUserAsync(userId, "Título Teste", "Corpo da Notificação", new { testId = 1 });

        // Assert
        Assert.True(sent);
    }

    [Fact]
    public async Task Controller_RegisterDevice_ReturnsOkResult()
    {
        // Arrange
        var userId = Guid.NewGuid();
        AuthenticateAs(userId);
        var request = new RegisterDeviceTokenRequest(userId, "ExponentPushToken[controller-test-token]", "android");

        // Act
        var actionResult = await _controller.RegisterDevice(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task Controller_RegisterDevice_IgnoresBodyUserId_UsesTokenIdentity()
    {
        var realUser = Guid.NewGuid();
        var victim = Guid.NewGuid();
        AuthenticateAs(realUser);

        await _controller.RegisterDevice(new RegisterDeviceTokenRequest(victim, "ExponentPushToken[spoof]", "ios"));

        Assert.Empty(await _tokenRepository.GetByUserIdAsync(victim));
        Assert.Single(await _tokenRepository.GetByUserIdAsync(realUser));
    }

    [Fact]
    public async Task Controller_RegisterDevice_WithoutIdentity_ReturnsUnauthorized()
    {
        _controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

        var result = await _controller.RegisterDevice(new RegisterDeviceTokenRequest(Guid.NewGuid(), "ExponentPushToken[x]", "ios"));

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task Controller_GetUserTokens_OtherUser_ReturnsForbid()
    {
        AuthenticateAs(Guid.NewGuid());

        var result = await _controller.GetUserTokens(Guid.NewGuid());

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task Controller_RemoveDevice_OtherUsersToken_IsNotRemoved()
    {
        var owner = Guid.NewGuid();
        var tokenStr = "ExponentPushToken[owned-by-someone-else]";
        await _pushService.RegisterDeviceTokenAsync(new RegisterDeviceTokenRequest(owner, tokenStr, "ios"));
        AuthenticateAs(Guid.NewGuid());

        await _controller.RemoveDevice(new RemoveDeviceTokenRequest(tokenStr));

        Assert.Single(await _tokenRepository.GetByUserIdAsync(owner));
    }

    [Fact]
    public async Task Controller_RemoveDevice_ReturnsOkResult()
    {
        // Arrange
        var tokenStr = "ExponentPushToken[controller-remove-test]";
        var userId = Guid.NewGuid();
        await _pushService.RegisterDeviceTokenAsync(new RegisterDeviceTokenRequest(userId, tokenStr, "ios"));
        AuthenticateAs(userId);

        // Act
        var actionResult = await _controller.RemoveDevice(new RemoveDeviceTokenRequest(tokenStr));

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task Controller_GetUserTokens_ReturnsRegisteredTokens()
    {
        // Arrange
        var userId = Guid.NewGuid();
        await _pushService.RegisterDeviceTokenAsync(new RegisterDeviceTokenRequest(userId, "ExponentPushToken[user-token-1]", "android"));
        await _pushService.RegisterDeviceTokenAsync(new RegisterDeviceTokenRequest(userId, "ExponentPushToken[user-token-2]", "ios"));
        AuthenticateAs(userId);

        // Act
        var actionResult = await _controller.GetUserTokens(userId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var list = Assert.IsAssignableFrom<System.Collections.IEnumerable>(okResult.Value);
        Assert.NotEmpty(list);
    }
}
