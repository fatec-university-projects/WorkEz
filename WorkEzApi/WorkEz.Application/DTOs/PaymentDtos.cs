using System.ComponentModel.DataAnnotations;

namespace WorkEz.Application.DTOs;

public record ProcessPaymentRequest(
    [Required] Guid ServiceId,
    [Required][Range(0.01, 1000000.00)] decimal Amount,
    [Required] string PaymentMethod,
    [Required] string TransactionId
);

public record PaymentResponseDto(
    bool Success,
    string Message,
    Guid ServiceId,
    decimal Amount,
    string TransactionId
);
