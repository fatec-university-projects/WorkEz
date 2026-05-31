namespace WorkEz.Api.Enums;

/// <summary>
/// Represents the current state of a payment record.
/// </summary>
public enum PaymentStatus
{
    Pending = 0,
    Paid = 1,
    Expired = 2,
    Cancelled = 3,
    Failed = 4,
    Refunded = 5
}
