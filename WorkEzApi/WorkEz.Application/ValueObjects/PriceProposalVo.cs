namespace WorkEz.Application.ValueObjects;

/// <summary>
/// Value Object (VO) imutável para cálculos financeiros de proposta.
/// </summary>
public record PriceProposalVo(
    decimal GrossAmount,
    decimal PlatformFee,
    decimal NetAmount
)
{
    private const decimal PlatformCommissionRate = 0.15m; // 15% taxa da plataforma

    public static PriceProposalVo Create(decimal grossAmount)
    {
        decimal fee = Math.Round(grossAmount * PlatformCommissionRate, 2);
        decimal net = grossAmount - fee;
        return new PriceProposalVo(grossAmount, fee, net);
    }
}
