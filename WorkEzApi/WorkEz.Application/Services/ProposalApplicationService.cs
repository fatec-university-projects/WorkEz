using WorkEz.Application.DTOs;
using WorkEz.Application.ValueObjects;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Services;

namespace WorkEz.Application.Services;

public interface IProposalApplicationService
{
    Task<Result<ProposalResponseDto>> ProposePriceAsync(ProposePriceRequest request);
    Task<Result<ProposalResponseDto>> AcceptProposalAsync(AcceptProposalRequest request);
    Task<Result> RejectProposalAsync(RejectProposalRequest request);
    Task<IEnumerable<ProposalResponseDto>> GetProposalsByServiceIdAsync(Guid serviceId);
}

/// <summary>
/// Application Service in Clean Architecture.
/// Responsible for orchestrating use cases, invoking the Domain Service, and MAPPING domain entities to DTOs/VOs.
/// </summary>
public class ProposalApplicationService(IProposalDomainService proposalDomainService) : IProposalApplicationService
{
    private readonly IProposalDomainService _proposalDomainService = proposalDomainService;

    public async Task<Result<ProposalResponseDto>> ProposePriceAsync(ProposePriceRequest request)
    {
        // 1. Invoca o Serviço de Domínio (retorna entidade do domínio)
        var result = await _proposalDomainService.ProposePriceAsync(
            request.ProviderUserId,
            request.ServiceId,
            request.ProposedPrice,
            request.Description,
            request.EstimatedTime
        );

        if (result.IsFailure)
        {
            return Result<ProposalResponseDto>.Failure(result.Error, result.ErrorCode);
        }

        // 2. Mapeamento da Entidade de Domínio para DTO/VO
        var dto = MapToResponseDto(result.Value);
        return Result<ProposalResponseDto>.Success(dto);
    }

    public async Task<Result<ProposalResponseDto>> AcceptProposalAsync(AcceptProposalRequest request)
    {
        // 1. Invoca o Serviço de Domínio
        var result = await _proposalDomainService.AcceptProposalAsync(request.CustomerUserId, request.ProposalId);
        if (result.IsFailure)
        {
            return Result<ProposalResponseDto>.Failure(result.Error, result.ErrorCode);
        }

        // 2. Mapeamento da Entidade para DTO/VO
        var dto = MapToResponseDto(result.Value);
        return Result<ProposalResponseDto>.Success(dto);
    }

    public async Task<Result> RejectProposalAsync(RejectProposalRequest request)
    {
        // Invoca o Serviço de Domínio
        return await _proposalDomainService.RejectProposalAsync(request.CustomerUserId, request.ProposalId, request.Reason);
    }

    public async Task<IEnumerable<ProposalResponseDto>> GetProposalsByServiceIdAsync(Guid serviceId)
    {
        // Busca entidades do domínio e realiza mapeamento para DTOs
        var proposals = await _proposalDomainService.GetProposalsByServiceIdAsync(serviceId);
        return proposals.Select(MapToResponseDto);
    }

    /// <summary>
    /// Mapeamento da Entidade de Domínio (Proposal) para DTO/VO na camada de Aplicação.
    /// </summary>
    private static ProposalResponseDto MapToResponseDto(Proposal proposal)
    {
        var financialVo = PriceProposalVo.Create(proposal.ProposedPrice);
        var providerName = proposal.Provider?.User?.Name ?? "Prestador";

        return new ProposalResponseDto(
            Id: proposal.Id,
            ServiceId: proposal.ServiceId,
            ProviderId: proposal.ProviderId,
            ProviderName: providerName,
            ProposedPrice: financialVo.GrossAmount,
            EstimatedPlatformFee: financialVo.PlatformFee,
            NetProviderEarnings: financialVo.NetAmount,
            Description: proposal.Description,
            EstimatedTime: proposal.EstimatedTime,
            Status: proposal.ProposalStatus.ToString(),
            CreatedAt: proposal.CreatedAt
        );
    }
}
