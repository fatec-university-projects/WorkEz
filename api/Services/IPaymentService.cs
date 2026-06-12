using WorkEz.Api.DTOs;

namespace WorkEz.Api.Services;

/// <summary>
/// Abstraction for the AbacatePay payment gateway.
/// Allows easy swapping of payment providers or test doubles.
/// </summary>
public interface IPaymentService
{
    /// <summary>
    /// Creates a PIX billing on AbacatePay and returns the payment URL and QR code.
    /// </summary>
    Task<CreatePaymentResponseDto> CreateBillingAsync(
        Guid paymentId,
        decimal amount,
        string customerName,
        string customerEmail,
        string? customerTaxId,
        string? customerCellphone);

    /// <summary>
    /// Retrieves the current status of a billing from AbacatePay by its external billing ID.
    /// </summary>
    Task<AbacatePayBillingDto?> GetBillingStatusAsync(string billingId);
}
