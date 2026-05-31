using WorkEz.Api.Enums;

namespace WorkEz.Api.Entities;

/// <summary>
/// Represents a payment for an <see cref="Appointment"/>, integrated with AbacatePay.
/// Webhook fields store raw gateway events for auditability.
/// </summary>
public class Payment
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid AppointmentId { get; set; }

    /// <summary>Payment ID returned by AbacatePay upon creation.</summary>
    public string? AbacatePayPaymentId { get; set; }

    /// <summary>Our internal reference ID sent to the gateway (idempotency key).</summary>
    public string? ExternalId { get; set; }

    /// <summary>URL where the customer completes the payment (PIX QR code page, boleto, etc.).</summary>
    public string? PaymentUrl { get; set; }

    /// <summary>URL to the payment receipt provided by AbacatePay after confirmation.</summary>
    public string? ReceiptUrl { get; set; }

    /// <summary>Expected amount in BRL (stored as cents or decimal, consistent with the rest of the system).</summary>
    public decimal Amount { get; set; }

    /// <summary>Actual amount confirmed as received by the gateway.</summary>
    public decimal? PaidAmount { get; set; }

    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Pix;

    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;

    /// <summary>Event type from the last received AbacatePay webhook (e.g. "payment.paid").</summary>
    public string? WebhookEventType { get; set; }

    /// <summary>Raw JSON body of the last received webhook for debugging and audit purposes.</summary>
    public string? WebhookPayload { get; set; }

    /// <summary>UTC timestamp when the payment was confirmed by the gateway.</summary>
    public DateTime? PaidAt { get; set; }

    /// <summary>UTC expiry deadline for the payment link.</summary>
    public DateTime? ExpiresAt { get; set; }

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // ── Navigation properties ──────────────────────────────────────────────────
    public Appointment Appointment { get; set; } = null!;
}
