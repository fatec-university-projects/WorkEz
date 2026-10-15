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
        var request = new RegisterDeviceTokenRequest(userId, "ExponentPushToken[controller-test-token]", "android");

        // Act
        var actionResult = await _controller.RegisterDevice(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task Controller_RemoveDevice_ReturnsOkResult()
    {
        // Arrange
        var tokenStr = "ExponentPushToken[controller-remove-test]";
        await _pushService.RegisterDeviceTokenAsync(new RegisterDeviceTokenRequest(Guid.NewGuid(), tokenStr, "ios"));

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

        // Act
        var actionResult = await _controller.GetUserTokens(userId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var list = Assert.IsAssignableFrom<System.Collections.IEnumerable>(okResult.Value);
        Assert.NotEmpty(list);
    }
}
