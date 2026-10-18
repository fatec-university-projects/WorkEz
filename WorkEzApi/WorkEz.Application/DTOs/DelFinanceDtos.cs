using System.Text.Json.Serialization;

namespace WorkEz.Application.DTOs;

public record DelFinanceSettings
{
    public string BaseUrl { get; set; } = "https://apisandbox.delbank.com.br";
    public string ApiKey { get; set; } = "PJPyJ2xGmyB9oDHyNIUwNOt1dgpgolBwcE16ybaKD5rYEc8ujLtarBP0nNw2FKdgK+5YJFciFwTdORlZsdaTzjEbKN5ut+Ag4xGy69bbtXJmzkzRDHry9ubYbMW4xFMb";
    public string AccountId { get; set; } = "31712";
    public string WebhookSecret { get; set; } = "workez-secret-token";
}

public class DelFinanceDictInitRequest
{
    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("holderDocument")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? HolderDocument { get; set; }
}

public class DelFinanceHolderDto
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("document")]
    public string Document { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string? Type { get; set; }
}

public class DelFinanceParticipantDto
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("ispb")]
    public string Ispb { get; set; } = string.Empty;
}

public class DelFinanceBeneficiaryDto
{
    [JsonPropertyName("number")]
    public string? Number { get; set; }

    [JsonPropertyName("branch")]
    public string? Branch { get; set; }

    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("holder")]
    public DelFinanceHolderDto? Holder { get; set; }

    [JsonPropertyName("participant")]
    public DelFinanceParticipantDto? Participant { get; set; }
}

public class DelFinanceDictInitResponse
{
    [JsonPropertyName("endToEndId")]
    public string EndToEndId { get; set; } = string.Empty;

    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("keyBelongsHolder")]
    public bool? KeyBelongsHolder { get; set; }

    [JsonPropertyName("beneficiary")]
    public DelFinanceBeneficiaryDto? Beneficiary { get; set; }
}

public class DelFinanceTransferRequest
{
    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("endToEndId")]
    public string EndToEndId { get; set; } = string.Empty;

    [JsonPropertyName("initiationType")]
    public string InitiationType { get; set; } = "KEY";
}

public class DelFinanceTransferResponse
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("endToEndId")]
    public string EndToEndId { get; set; } = string.Empty;

    [JsonPropertyName("externalId")]
    public string? ExternalId { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime? CreatedAt { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("beneficiary")]
    public DelFinanceBeneficiaryDto? Beneficiary { get; set; }
}

public class DelFinanceDynamicQrCodeRequest
{
    [JsonPropertyName("correlationId")]
    public string CorrelationId { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("expiresIn")]
    public int ExpiresIn { get; set; } = 86400;

    [JsonPropertyName("formatResponse")]
    public string FormatResponse { get; set; } = "PAYLOAD_AND_QRCODE";
}

public class DelFinanceDynamicQrCodeResponse
{
    [JsonPropertyName("transactionId")]
    public string TransactionId { get; set; } = string.Empty;

    [JsonPropertyName("payloadPix")]
    public string PayloadPix { get; set; } = string.Empty;

    [JsonPropertyName("qrCodeImageBase64")]
    public string QrCodeImageBase64 { get; set; } = string.Empty;
}

public class DelFinanceWebhookErrorDto
{
    [JsonPropertyName("code")]
    public string? Code { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

public class DelFinanceWebhookProofDto
{
    [JsonPropertyName("eventType")]
    public string? EventType { get; set; }

    [JsonPropertyName("endToEndId")]
    public string? EndToEndId { get; set; }

    [JsonPropertyName("idempotencyKey")]
    public string? IdempotencyKey { get; set; }

    [JsonPropertyName("correlationId")]
    public string? CorrelationId { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("amount")]
    public decimal? Amount { get; set; }

    [JsonPropertyName("payer")]
    public DelFinanceBeneficiaryDto? Payer { get; set; }

    [JsonPropertyName("beneficiary")]
    public DelFinanceBeneficiaryDto? Beneficiary { get; set; }
}

public class DelFinanceWebhookPayload
{
    [JsonPropertyName("eventType")]
    public string EventType { get; set; } = string.Empty;

    [JsonPropertyName("correlationId")]
    public string? CorrelationId { get; set; }

    [JsonPropertyName("referenceId")]
    public string? ReferenceId { get; set; }

    [JsonPropertyName("endToEndId")]
    public string? EndToEndId { get; set; }

    [JsonPropertyName("amount")]
    public decimal? Amount { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("idempotencyKey")]
    public string? IdempotencyKey { get; set; }

    [JsonPropertyName("proof")]
    public DelFinanceWebhookProofDto? Proof { get; set; }

    [JsonPropertyName("error")]
    public DelFinanceWebhookErrorDto? Error { get; set; }
}

public record EscrowCheckoutPixDto(
    Guid ServiceId,
    string ServiceTitle,
    decimal TotalAmount,
    decimal LaborAmount,
    decimal MaterialsAmount,
    string PixCopiaECola,
    string QrCodeBase64,
    string CorrelationId,
    string TransactionId,
    DateTime ExpiresAt
);
