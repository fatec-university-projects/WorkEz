namespace WorkEz.Application.ValueObjects;

/// <summary>
/// Value Object (VO) imutável para cálculos financeiros de proposta.
/// A taxa de 15% incide estritamente sobre a mão de obra. Materiais/peças não sofrem retenção da plataforma.
/// </summary>
public record PriceProposalVo(
    decimal GrossAmount,
    decimal LaborAmount,
    decimal MaterialsAmount,
    decimal PlatformFee,
    decimal NetAmount
)
{
    private const decimal PlatformCommissionRate = 0.15m; // 15% taxa da plataforma sobre a mão de obra

    public static PriceProposalVo Create(decimal? laborPrice, decimal? materialsPrice, decimal proposedPrice)
    {
        decimal labor = laborPrice ?? (proposedPrice - (materialsPrice ?? 0m));
        if (labor < 0) labor = proposedPrice;
        decimal materials = materialsPrice ?? 0m;
        decimal gross = labor + materials;
        if (gross <= 0) gross = proposedPrice;

        decimal fee = Math.Round(labor * PlatformCommissionRate, 2);
        decimal net = gross - fee;
        return new PriceProposalVo(gross, labor, materials, fee, net);
    }

    public static PriceProposalVo Create(decimal grossAmount) =>
        Create(grossAmount, 0m, grossAmount);
}
