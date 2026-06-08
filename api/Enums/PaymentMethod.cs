namespace WorkEz.Api.Enums;

/// <summary>
/// Supported payment methods processed through AbacatePay.
/// </summary>
public enum PaymentMethod
{
    /// <summary>Brazilian instant payment (PIX).</summary>
    Pix = 0,

    /// <summary>Credit card payment.</summary>
    CreditCard = 1,

    /// <summary>Debit card payment.</summary>
    DebitCard = 2,

    /// <summary>Bank slip (Boleto Bancário).</summary>
    Boleto = 3
}
