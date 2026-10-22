using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using WorkEz.Application.DTOs;
using WorkEz.Domain.Common;

namespace WorkEz.Application.Services;

public class DelFinanceClient : IDelFinanceClient
{
    private readonly HttpClient _httpClient;
    private readonly DelFinanceSettings _settings;
    private readonly ILogger<DelFinanceClient> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public DelFinanceClient(
        HttpClient httpClient,
        ILogger<DelFinanceClient> logger,
        DelFinanceSettings? settings = null)
    {
        _httpClient = httpClient;
        _logger = logger;
        _settings = settings ?? new DelFinanceSettings();

        var baseUrl = _settings.BaseUrl.TrimEnd('/');
        if (_httpClient.BaseAddress == null)
        {
            _httpClient.BaseAddress = new Uri(baseUrl);
        }

        ApplyDefaultHeaders();
    }

    private void ApplyDefaultHeaders()
    {
        if (!_httpClient.DefaultRequestHeaders.Contains("x-delbank-api-key"))
        {
            _httpClient.DefaultRequestHeaders.Add("x-delbank-api-key", _settings.ApiKey);
        }
        if (!_httpClient.DefaultRequestHeaders.Contains("x-delfinance-account-id"))
        {
            _httpClient.DefaultRequestHeaders.Add("x-delfinance-account-id", _settings.AccountId);
        }
        if (!_httpClient.DefaultRequestHeaders.Contains("User-Agent"))
        {
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "WorkEz-Api/1.0");
        }
    }

    public async Task<Result<DelFinanceDictInitResponse>> InitializePaymentByKeyAsync(
        string pixKey,
        string? holderDocument = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            ApplyDefaultHeaders();
            var payload = new DelFinanceDictInitRequest
            {
                Key = pixKey.Trim(),
                HolderDocument = string.IsNullOrWhiteSpace(holderDocument) ? null : holderDocument.Trim()
            };

            _logger.LogInformation("[DelFinance] Initializing DICT payment lookup for key: {PixKey}", pixKey);
            var response = await _httpClient.PostAsJsonAsync("/baas/api/v2/pix/dict/payment-initialization", payload, JsonOptions, cancellationToken);

            var rawContent = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("[DelFinance] DICT payment initialization failed with status {StatusCode}: {Response}", response.StatusCode, rawContent);
                return Result<DelFinanceDictInitResponse>.Failure($"Erro ao consultar chave PIX no DelFinance: {rawContent}", "DELFINANCE_DICT_ERROR");
            }

            var result = JsonSerializer.Deserialize<DelFinanceDictInitResponse>(rawContent, JsonOptions);
            if (result == null || string.IsNullOrWhiteSpace(result.EndToEndId))
            {
                return Result<DelFinanceDictInitResponse>.Failure("Resposta inválida do DelFinance DICT.", "DELFINANCE_INVALID_RESPONSE");
            }

            _logger.LogInformation("[DelFinance] DICT lookup successful. EndToEndId: {EndToEndId}, Beneficiary: {Beneficiary}",
                result.EndToEndId, result.Beneficiary?.Holder?.Name ?? "N/A");

            return Result<DelFinanceDictInitResponse>.Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[DelFinance] Exception during DICT payment initialization for key {PixKey}", pixKey);
            return Result<DelFinanceDictInitResponse>.Failure($"Falha na comunicação com o BaaS DelFinance: {ex.Message}", "DELFINANCE_HTTP_ERROR");
        }
    }

    public async Task<Result<DelFinanceTransferResponse>> ExecuteTransferAsync(
        decimal amount,
        string endToEndId,
        string description,
        Guid? idempotencyKey = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            ApplyDefaultHeaders();
            var idempotency = (idempotencyKey ?? Guid.NewGuid()).ToString();

            var request = new HttpRequestMessage(HttpMethod.Post, "/baas/api/v2/transfers")
            {
                Content = JsonContent.Create(new DelFinanceTransferRequest
                {
                    Amount = amount,
                    Description = description,
                    EndToEndId = endToEndId,
                    InitiationType = "KEY"
                }, options: JsonOptions)
            };

            request.Headers.Add("IdempotencyKey", idempotency);

            _logger.LogInformation("[DelFinance] Executing transfer of R$ {Amount:F2} (E2E: {EndToEndId}, Idempotency: {Idempotency})",
                amount, endToEndId, idempotency);

            var response = await _httpClient.SendAsync(request, cancellationToken);
            var rawContent = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("[DelFinance] Transfer failed with status {StatusCode}: {Response}", response.StatusCode, rawContent);
                return Result<DelFinanceTransferResponse>.Failure($"Erro ao executar transferência no DelFinance: {rawContent}", "DELFINANCE_TRANSFER_ERROR");
            }

            var transferResponse = JsonSerializer.Deserialize<DelFinanceTransferResponse>(rawContent, JsonOptions);
            if (transferResponse == null)
            {
                return Result<DelFinanceTransferResponse>.Failure("Resposta de transferência inválida do DelFinance.", "DELFINANCE_INVALID_RESPONSE");
            }

            _logger.LogInformation("[DelFinance] Transfer created successfully. Id: {Id}, Status: {Status}",
                transferResponse.Id, transferResponse.Status);

            return Result<DelFinanceTransferResponse>.Success(transferResponse);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[DelFinance] Exception during transfer execution for E2E {EndToEndId}", endToEndId);
            return Result<DelFinanceTransferResponse>.Failure($"Falha ao transferir via BaaS DelFinance: {ex.Message}", "DELFINANCE_HTTP_ERROR");
        }
    }

    public async Task<Result<DelFinanceDynamicQrCodeResponse>> CreateDynamicPixChargeAsync(
        Guid correlationId,
        decimal amount,
        string? description = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            ApplyDefaultHeaders();
            var payload = new DelFinanceDynamicQrCodeRequest
            {
                CorrelationId = correlationId.ToString(),
                Amount = Math.Round(amount, 2),
                ExpiresIn = 86400,
                FormatResponse = "PAYLOAD_AND_QRCODE"
            };

            _logger.LogInformation("[DelFinance] Creating dynamic Pix charge of R$ {Amount:F2} (CorrelationId: {CorrelationId})",
                amount, correlationId);

            var response = await _httpClient.PostAsJsonAsync("/baas/api/v2/pix/qrcode/dynamic", payload, JsonOptions, cancellationToken);
            var rawContent = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("[DelFinance] Dynamic QR Code creation failed with status {StatusCode}: {Response}", response.StatusCode, rawContent);
                return Result<DelFinanceDynamicQrCodeResponse>.Failure($"Erro ao gerar cobrança Pix no DelFinance: {rawContent}", "DELFINANCE_QRCODE_ERROR");
            }

            var qrCodeResult = JsonSerializer.Deserialize<DelFinanceDynamicQrCodeResponse>(rawContent, JsonOptions);
            if (qrCodeResult == null || string.IsNullOrWhiteSpace(qrCodeResult.PayloadPix))
            {
                return Result<DelFinanceDynamicQrCodeResponse>.Failure("Resposta de QR Code inválida do DelFinance.", "DELFINANCE_INVALID_RESPONSE");
            }

            _logger.LogInformation("[DelFinance] Dynamic Pix charge created successfully. TransactionId: {TxId}",
                qrCodeResult.TransactionId);

            return Result<DelFinanceDynamicQrCodeResponse>.Success(qrCodeResult);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[DelFinance] Exception creating dynamic Pix charge for CorrelationId {CorrelationId}", correlationId);
            return Result<DelFinanceDynamicQrCodeResponse>.Failure($"Falha ao gerar Pix dinâmico no DelFinance: {ex.Message}", "DELFINANCE_HTTP_ERROR");
        }
    }
}
