namespace WorkEz.Application.ValueObjects;

public record PriceProposalVo(
    decimal GrossAmount,
    decimal PlatformFee,
    decimal NetAmount
)
{
    private const decimal PlatformCommissionRate = 0.15m;

    public static PriceProposalVo Create(decimal grossAmount)
    {
        decimal fee = Math.Round(grossAmount * PlatformCommissionRate, 2);
        decimal net = grossAmount - fee;
        return new PriceProposalVo(grossAmount, fee, net);
    }
}
