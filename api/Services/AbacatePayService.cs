using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using WorkEz.Api.DTOs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace WorkEz.Api.Services;

/// <summary>
/// Real AbacatePay integration via REST API.
/// Docs: https://abacatepay.com/docs
/// </summary>
public class AbacatePayService : IPaymentService
{
    private readonly HttpClient      _http;
    private readonly ILogger<AbacatePayService> _logger;
    private readonly string          _baseUrl;

    private static readonly JsonSerializerOptions _json = new()
    {
        PropertyNamingPolicy        = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    public AbacatePayService(
        HttpClient                  httpClient,
        IConfiguration              configuration,
        ILogger<AbacatePayService>  logger)
    {
        _http   = httpClient;
        _logger = logger;

        var section = configuration.GetSection("AbacatePay");
        var apiKey  = section["ApiKey"]
            ?? throw new InvalidOperationException("AbacatePay:ApiKey is missing from configuration.");

        _baseUrl = section["BaseUrl"] ?? "https://api.abacatepay.com/v1";

        _http.BaseAddress                         = new Uri(_baseUrl.TrimEnd('/') + "/");
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        _http.DefaultRequestHeaders.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/json"));
    }

    // ── Create billing ─────────────────────────────────────────────────────────

    public async Task<CreatePaymentResponseDto> CreateBillingAsync(
        Guid    paymentId,
        decimal amount,
        string  customerName,
        string  customerEmail,
        string? customerTaxId,
        string? customerCellphone)
    {
        // AbacatePay v1 expects price in centavos (integer)
        var amountCents = (int)Math.Round(amount * 100);

        var payload = new CreateBillingRequestDto
        {
            Frequency      = "ONE_TIME",
            Methods        = ["PIX"],
            ExternalId     = paymentId.ToString(),
            ReturnUrl      = "https://workez.app/pagamento/processando",
            CompletionUrl  = "https://workez.app/pagamento/concluido",
            Customer       = new AbacatePayCustomerDto
            {
                Name      = customerName,
                Email     = customerEmail,
                TaxId     = customerTaxId ?? "000.000.001-91", // fallback for dev/test
                Cellphone = customerCellphone ?? "11999999999",
            },
            Products =
            [
                new AbacatePayProductDto
                {
                    ExternalId  = paymentId.ToString(),
                    Name        = "Serviço WorkEz",
                    Description = $"Pagamento de serviço – Ref. {paymentId}",
                    Quantity    = 1,
                    Price       = amountCents,
                }
            ],
        };

        var body    = JsonSerializer.Serialize(payload, _json);
        var content = new StringContent(body, Encoding.UTF8, "application/json");

        _logger.LogInformation(
            "AbacatePay → CreateBilling | PaymentId={PaymentId} | Amount={Amount} centavos",
            paymentId, amountCents);

        HttpResponseMessage response;
        try
        {
            response = await _http.PostAsync("billing/create", content);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AbacatePay HTTP request failed");
            throw new InvalidOperationException("Não foi possível conectar ao gateway de pagamento.", ex);
        }

        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError(
                "AbacatePay returned {StatusCode}: {Body}", response.StatusCode, responseBody);
            throw new InvalidOperationException(
                $"Gateway de pagamento retornou erro {(int)response.StatusCode}.");
        }

        var envelope = JsonSerializer.Deserialize<AbacatePayEnvelopeDto<AbacatePayBillingDto>>(
            responseBody, _json);

        if (envelope is null || !envelope.Success || envelope.Data is null)
        {
            _logger.LogError("AbacatePay returned invalid envelope: {Body}", responseBody);
            throw new InvalidOperationException(
                envelope?.Error ?? "Resposta inválida do gateway de pagamento.");
        }

        var billing = envelope.Data;

        _logger.LogInformation(
            "AbacatePay ← BillingId={BillingId} | Status={Status} | Url={Url}",
            billing.Id, billing.Status, billing.Url);

        return new CreatePaymentResponseDto
        {
            PaymentId  = paymentId,
            PaymentUrl = billing.Url,
            PixCode    = billing.PixCode,
            PixQrCode  = billing.PixQrCode,
            Status     = billing.Status,
            ExpiresAt  = billing.ExpiresAt,
            Amount     = amount,
        };
    }


    // ── Get billing status ─────────────────────────────────────────────────────

    public async Task<AbacatePayBillingDto?> GetBillingStatusAsync(string billingId)
    {
        _logger.LogInformation("AbacatePay → GetBillingStatus | BillingId={BillingId}", billingId);

        HttpResponseMessage response;
        try
        {
            response = await _http.GetAsync($"billing/{billingId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AbacatePay GetBillingStatus HTTP request failed");
            return null;
        }

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "AbacatePay GetBillingStatus returned {StatusCode} for BillingId={BillingId}",
                response.StatusCode, billingId);
            return null;
        }

        var body     = await response.Content.ReadAsStringAsync();
        var envelope = JsonSerializer.Deserialize<AbacatePayEnvelopeDto<AbacatePayBillingDto>>(
            body, _json);

        return envelope?.Data;
    }
}
