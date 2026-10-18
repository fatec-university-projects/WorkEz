using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using WorkEz.Application.DTOs;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Interfaces;

namespace WorkEz.Application.Services;

public interface IPushNotificationService
{
    Task<Result<UserDeviceToken>> RegisterDeviceTokenAsync(RegisterDeviceTokenRequest request);
    Task<Result> RemoveDeviceTokenAsync(string expoPushToken);
    Task<bool> SendToUserAsync(Guid userId, string title, string body, object? data = null);
    Task<int> SendToUsersAsync(IEnumerable<Guid> userIds, string title, string body, object? data = null);
    Task<bool> SendPushAsync(string expoPushToken, string title, string body, object? data = null);
    Task<int> SendPushBatchAsync(IEnumerable<string> expoPushTokens, string title, string body, object? data = null);
    Task<IEnumerable<UserDeviceToken>> GetTokensByUserAsync(Guid userId);
}

public class PushNotificationService : IPushNotificationService
{
    private const string ExpoPushEndpoint = "https://exp.host/--/api/v2/push/send";
    private readonly IUserDeviceTokenRepository _tokenRepository;
    private readonly HttpClient _httpClient;
    private readonly ILogger<PushNotificationService> _logger;

    public PushNotificationService(
        IUserDeviceTokenRepository tokenRepository,
        HttpClient httpClient,
        ILogger<PushNotificationService> logger)
    {
        _tokenRepository = tokenRepository;
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<Result<UserDeviceToken>> RegisterDeviceTokenAsync(RegisterDeviceTokenRequest request)
    {
        if (request.UserId == Guid.Empty)
            return Result<UserDeviceToken>.Failure("UserId inválido.", "INVALID_USER");

        if (string.IsNullOrWhiteSpace(request.ExpoPushToken))
            return Result<UserDeviceToken>.Failure("ExpoPushToken é obrigatório.", "INVALID_TOKEN");

        try
        {
            var token = await _tokenRepository.RegisterOrUpdateAsync(
                request.UserId,
                request.ExpoPushToken.Trim(),
                request.Platform?.Trim());

            _logger.LogInformation("[PushNotification] Registered token for user {UserId} (Platform: {Platform})", 
                request.UserId, request.Platform ?? "Unknown");

            return Result<UserDeviceToken>.Success(token);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PushNotification] Failed to register token for user {UserId}", request.UserId);
            return Result<UserDeviceToken>.Failure("Erro ao registrar token de notificação.", "INTERNAL_ERROR");
        }
    }

    public async Task<Result> RemoveDeviceTokenAsync(string expoPushToken)
    {
        if (string.IsNullOrWhiteSpace(expoPushToken))
            return Result.Failure("Token inválido.", "INVALID_TOKEN");

        try
        {
            await _tokenRepository.RemoveByTokenAsync(expoPushToken.Trim());
            _logger.LogInformation("[PushNotification] Removed token {Token}", expoPushToken);
            return Result.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PushNotification] Failed to remove token {Token}", expoPushToken);
            return Result.Failure("Erro ao remover token.", "INTERNAL_ERROR");
        }
    }

    public async Task<IEnumerable<UserDeviceToken>> GetTokensByUserAsync(Guid userId)
    {
        return await _tokenRepository.GetByUserIdAsync(userId);
    }

    public async Task<bool> SendToUserAsync(Guid userId, string title, string body, object? data = null)
    {
        var tokens = (await _tokenRepository.GetByUserIdAsync(userId)).Select(t => t.ExpoPushToken).Distinct().ToList();
        if (tokens.Count == 0)
        {
            _logger.LogInformation("[PushNotification] No registered push tokens found for user {UserId}", userId);
            return false;
        }

        var sentCount = await SendPushBatchAsync(tokens, title, body, data);
        return sentCount > 0;
    }

    public async Task<int> SendToUsersAsync(IEnumerable<Guid> userIds, string title, string body, object? data = null)
    {
        var distinctUserIds = userIds.Distinct().ToList();
        if (distinctUserIds.Count == 0) return 0;

        var tokens = (await _tokenRepository.GetByUserIdsAsync(distinctUserIds))
            .Select(t => t.ExpoPushToken)
            .Distinct()
            .ToList();

        if (tokens.Count == 0)
        {
            _logger.LogInformation("[PushNotification] No tokens found for {Count} target users", distinctUserIds.Count);
            return 0;
        }

        return await SendPushBatchAsync(tokens, title, body, data);
    }

    public async Task<bool> SendPushAsync(string expoPushToken, string title, string body, object? data = null)
    {
        var count = await SendPushBatchAsync(new[] { expoPushToken }, title, body, data);
        return count > 0;
    }

    public async Task<int> SendPushBatchAsync(IEnumerable<string> expoPushTokens, string title, string body, object? data = null)
    {
        var validTokens = expoPushTokens
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Distinct()
            .ToList();

        if (validTokens.Count == 0) return 0;

        // Separa tokens reais da Expo de tokens simulados para ambiente local/testes
        var realExpoTokens = validTokens.Where(IsValidExpoToken).ToList();
        var simulatedTokens = validTokens.Where(t => !IsValidExpoToken(t)).ToList();

        if (simulatedTokens.Count != 0)
        {
            _logger.LogInformation("[PushNotification] [Simulated Delivery] To: {TokensCount} tokens | Title: {Title} | Body: {Body}",
                simulatedTokens.Count, title, body);
        }

        if (realExpoTokens.Count == 0)
        {
            return simulatedTokens.Count;
        }

        int successCount = 0;

        // Processa em lotes de 100 conforme recomendação oficial da Expo
        foreach (var chunk in realExpoTokens.Chunk(100))
        {
            var success = await SendChunkToExpoAsync(chunk, title, body, data);
            if (success)
            {
                successCount += chunk.Length;
            }
        }

        return successCount + simulatedTokens.Count;
    }

    private async Task<bool> SendChunkToExpoAsync(string[] chunk, string title, string body, object? data)
    {
        var messages = chunk.Select(token => new
        {
            to = token,
            sound = "default",
            priority = "high",
            channelId = "default",
            title,
            body,
            data
        }).ToList();

        try
        {
            var response = await _httpClient.PostAsJsonAsync(ExpoPushEndpoint, messages);
            if (response.IsSuccessStatusCode)
            {
                var responseJson = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("[PushNotification] Expo Push response: {Response}", responseJson);

                // Verifica se tokens inválidos retornaram 'DeviceNotRegistered' para autolimpeza
                await HandleExpoTicketReceiptsAsync(responseJson, chunk);
                return true;
            }

            var errorContent = await response.Content.ReadAsStringAsync();
            _logger.LogWarning("[PushNotification] Expo Push API returned error HTTP {StatusCode}: {Error}",
                response.StatusCode, errorContent);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PushNotification] Exception while sending push batch to Expo API");
            return false;
        }
    }

    private static bool IsValidExpoToken(string token)
    {
        return token.StartsWith("ExponentPushToken[", StringComparison.OrdinalIgnoreCase) ||
               token.StartsWith("ExpoPushToken[", StringComparison.OrdinalIgnoreCase);
    }

    private async Task HandleExpoTicketReceiptsAsync(string responseJson, string[] sentTokens)
    {
        try
        {
            using var doc = JsonDocument.Parse(responseJson);
            if (!doc.RootElement.TryGetProperty("data", out var dataElement) || dataElement.ValueKind != JsonValueKind.Array)
                return;

            int index = 0;
            foreach (var ticket in dataElement.EnumerateArray())
            {
                if (index < sentTokens.Length)
                {
                    if (ticket.TryGetProperty("status", out var status) && status.GetString() == "error")
                    {
                        if (ticket.TryGetProperty("details", out var details) &&
                            details.TryGetProperty("error", out var errorDetail) &&
                            errorDetail.GetString() == "DeviceNotRegistered")
                        {
                            var deadToken = sentTokens[index];
                            _logger.LogWarning("[PushNotification] Device token {Token} is no longer registered. Removing.", deadToken);
                            await _tokenRepository.RemoveByTokenAsync(deadToken);
                        }
                    }
                }
                index++;
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "[PushNotification] Could not parse ticket responses for cleanup");
        }
    }
}
