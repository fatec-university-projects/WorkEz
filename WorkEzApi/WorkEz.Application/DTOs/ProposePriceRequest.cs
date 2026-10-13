using System.ComponentModel.DataAnnotations;

namespace WorkEz.Application.DTOs;

/// <summary>
/// DTO Request para envio de proposta de preço pelo prestador.
/// Suporta valor global e discriminação entre Mão de Obra e Materiais.
/// </summary>
public record ProposePriceRequest(
    [Required] Guid ProviderUserId,
    [Required] Guid ServiceId,
    [Required][Range(0.01, 100000.00)] decimal ProposedPrice,
    string? Description,
    string? EstimatedTime,
    decimal? LaborPrice = null,
    decimal? MaterialsPrice = null
);
