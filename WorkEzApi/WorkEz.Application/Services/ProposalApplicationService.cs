using WorkEz.Application.DTOs;
using WorkEz.Application.ValueObjects;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Services;

namespace WorkEz.Application.Services;

public class ProposalApplicationService(IProposalDomainService proposalDomainService) : IProposalApplicationService
{
    private readonly IProposalDomainService _proposalDomainService = proposalDomainService;

    public async Task<Result<ProposalResponseDto>> ProposePriceAsync(ProposePriceRequest request)
    {
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

        var dto = MapToResponseDto(result.Value);
        return Result<ProposalResponseDto>.Success(dto);
    }

    public async Task<Result<ProposalResponseDto>> AcceptProposalAsync(AcceptProposalRequest request)
    {
        var result = await _proposalDomainService.AcceptProposalAsync(request.CustomerUserId, request.ProposalId);
        if (result.IsFailure)
        {
            return Result<ProposalResponseDto>.Failure(result.Error, result.ErrorCode);
        }

        var dto = MapToResponseDto(result.Value);
        return Result<ProposalResponseDto>.Success(dto);
    }

    public async Task<Result> RejectProposalAsync(RejectProposalRequest request)
    {
        return await _proposalDomainService.RejectProposalAsync(request.CustomerUserId, request.ProposalId, request.Reason);
    }

    public async Task<IEnumerable<ProposalResponseDto>> GetProposalsByServiceIdAsync(Guid serviceId)
    {
        var proposals = await _proposalDomainService.GetProposalsByServiceIdAsync(serviceId);
        return proposals.Select(MapToResponseDto);
    }

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
