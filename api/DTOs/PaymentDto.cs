using System.Text.Json.Serialization;

namespace WorkEz.Api.DTOs;

// ── Criar cobrança ─────────────────────────────────────────────────────────────

/// <summary>Customer data sent to AbacatePay when creating a billing.</summary>
public class AbacatePayCustomerDto
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    /// <summary>CPF or CNPJ formatted (e.g. "000.000.001-91").</summary>
    [JsonPropertyName("taxId")]
    public string TaxId { get; set; } = string.Empty;

    /// <summary>AbacatePay v1 uses 'cellphone' (not 'phone').</summary>
    [JsonPropertyName("cellphone")]
    public string Cellphone { get; set; } = string.Empty;
}


/// <summary>Product item required by AbacatePay v1 billing/create.</summary>
public class AbacatePayProductDto
{
    [JsonPropertyName("externalId")]
    public string ExternalId { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; } = 1;

    /// <summary>Price in BRL cents (e.g. R$ 150,00 → 15000).</summary>
    [JsonPropertyName("price")]
    public int Price { get; set; }
}

/// <summary>Request payload sent to AbacatePay POST /v1/billing/create.</summary>
public class CreateBillingRequestDto
{
    /// <summary>ONE_TIME for single payments.</summary>
    [JsonPropertyName("frequency")]
    public string Frequency { get; set; } = "ONE_TIME";

    /// <summary>Payment method: "PIX".</summary>
    [JsonPropertyName("methods")]
    public string[] Methods { get; set; } = ["PIX"];

    /// <summary>List of products/services in the billing.</summary>
    [JsonPropertyName("products")]
    public AbacatePayProductDto[] Products { get; set; } = [];

    [JsonPropertyName("customer")]
    public AbacatePayCustomerDto Customer { get; set; } = new();

    /// <summary>Idempotency key – we send our Payment.Id.</summary>
    [JsonPropertyName("externalId")]
    public string? ExternalId { get; set; }

    /// <summary>URL to redirect after payment is initiated.</summary>
    [JsonPropertyName("returnUrl")]
    public string ReturnUrl { get; set; } = "https://workez.app/pagamento/processando";

    /// <summary>URL to redirect after payment is completed.</summary>
    [JsonPropertyName("completionUrl")]
    public string CompletionUrl { get; set; } = "https://workez.app/pagamento/concluido";
}


/// <summary>Billing object returned inside the AbacatePay response envelope.</summary>
public class AbacatePayBillingDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public int Amount { get; set; }

    [JsonPropertyName("externalId")]
    public string? ExternalId { get; set; }

    [JsonPropertyName("expiresAt")]
    public DateTime? ExpiresAt { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    /// <summary>PIX copy-paste code (copia e cola).</summary>
    [JsonPropertyName("pixCode")]
    public string? PixCode { get; set; }

    /// <summary>Base64-encoded QR code image.</summary>
    [JsonPropertyName("pixQrCode")]
    public string? PixQrCode { get; set; }
}

/// <summary>Standard AbacatePay response envelope { data, error, success }.</summary>
public class AbacatePayEnvelopeDto<T>
{
    [JsonPropertyName("data")]
    public T? Data { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }

    [JsonPropertyName("success")]
    public bool Success { get; set; }
}

// ── Webhook ───────────────────────────────────────────────────────────────────

/// <summary>Payload sent by AbacatePay to our webhook endpoint.</summary>
public class AbacatePayWebhookDto
{
    /// <summary>Event name, e.g. "BILLING_PAID" or "BILLING_EXPIRED".</summary>
    [JsonPropertyName("event")]
    public string Event { get; set; } = string.Empty;

    [JsonPropertyName("data")]
    public AbacatePayWebhookDataDto? Data { get; set; }
}

public class AbacatePayWebhookDataDto
{
    [JsonPropertyName("billing")]
    public AbacatePayBillingDto? Billing { get; set; }
}

// ── Respostas para o app ───────────────────────────────────────────────────────

/// <summary>Simplified response returned to the mobile app after creating a payment.</summary>
public class CreatePaymentResponseDto
{
    public Guid PaymentId { get; set; }
    public string? PaymentUrl { get; set; }
    public string? PixCode { get; set; }
    public string? PixQrCode { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? ExpiresAt { get; set; }
    public decimal Amount { get; set; }
}

/// <summary>Payment status query response for polling.</summary>
public class PaymentStatusResponseDto
{
    public Guid PaymentId { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal? PaidAmount { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? PaymentUrl { get; set; }
    public string? PixCode { get; set; }
}
