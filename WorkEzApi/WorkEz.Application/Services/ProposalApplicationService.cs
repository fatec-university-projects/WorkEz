using WorkEz.Application.DTOs;
using WorkEz.Application.ValueObjects;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Interfaces;
using WorkEz.Domain.Services;

namespace WorkEz.Application.Services;

public interface IProposalApplicationService
{
    Task<Result<ProposalResponseDto>> ProposePriceAsync(ProposePriceRequest request);
    Task<Result<ProposalResponseDto>> AcceptProposalAsync(AcceptProposalRequest request);
    Task<Result> RejectProposalAsync(RejectProposalRequest request);
    Task<ProposalResponseDto?> GetProposalByIdAsync(Guid id);
    Task<IEnumerable<ProposalResponseDto>> GetProposalsByServiceIdAsync(Guid serviceId);
    Task<IEnumerable<ProposalResponseDto>> GetProposalsByProviderUserIdAsync(Guid providerUserId);

    // ── Negociação ───────────────────────────────────────────────
    Task<Result<ProposalResponseDto>> CounterProposalAsync(CounterProposalRequest request);
    Task<Result<ProposalResponseDto>> AcceptCounterAsync(AcceptCounterRequest request);
    Task<Result<ProposalResponseDto>> RejectCounterAsync(RejectCounterRequest request);
    Task<Result<ChatMessageDto>> SendChatMessageAsync(SendChatMessageRequest request);
    Task<IEnumerable<ChatMessageDto>> GetChatMessagesAsync(Guid proposalId);
    Task<ProposalResponseDto?> GetActiveChatProposalByServiceIdAsync(Guid serviceId);
}

/// <summary>
/// Application Service in Clean Architecture.
/// Responsible for orchestrating use cases, invoking the Domain Service, and MAPPING domain entities to DTOs/VOs.
/// </summary>
public class ProposalApplicationService(IProposalDomainService proposalDomainService, IChatMessageRepository chatMessageRepository) : IProposalApplicationService
{
    private readonly IProposalDomainService _proposalDomainService = proposalDomainService;
    private readonly IChatMessageRepository _chatMessageRepository = chatMessageRepository;

    public async Task<Result<ProposalResponseDto>> ProposePriceAsync(ProposePriceRequest request)
    {
        var result = await _proposalDomainService.ProposePriceAsync(
            request.ProviderUserId, request.ServiceId, request.ProposedPrice,
            request.Description, request.EstimatedTime,
            request.LaborPrice, request.MaterialsPrice);
        if (result.IsFailure) return Result<ProposalResponseDto>.Failure(result.Error, result.ErrorCode);
        return Result<ProposalResponseDto>.Success(MapToResponseDto(result.Value));
    }

    public async Task<Result<ProposalResponseDto>> AcceptProposalAsync(AcceptProposalRequest request)
    {
        var result = await _proposalDomainService.AcceptProposalAsync(request.CustomerUserId, request.ProposalId);
        if (result.IsFailure) return Result<ProposalResponseDto>.Failure(result.Error, result.ErrorCode);
        return Result<ProposalResponseDto>.Success(MapToResponseDto(result.Value));
    }

    public async Task<Result> RejectProposalAsync(RejectProposalRequest request)
        => await _proposalDomainService.RejectProposalAsync(request.CustomerUserId, request.ProposalId, request.Reason);

    public async Task<ProposalResponseDto?> GetProposalByIdAsync(Guid id)
    {
        var proposal = await _proposalDomainService.GetByIdAsync(id);
        return proposal is null ? null : MapToResponseDto(proposal);
    }

    public async Task<IEnumerable<ProposalResponseDto>> GetProposalsByServiceIdAsync(Guid serviceId)
    {
        var proposals = await _proposalDomainService.GetProposalsByServiceIdAsync(serviceId);
        return proposals.Select(MapToResponseDto);
    }

    public async Task<IEnumerable<ProposalResponseDto>> GetProposalsByProviderUserIdAsync(Guid providerUserId)
    {
        var proposals = await _proposalDomainService.GetProposalsByProviderUserIdAsync(providerUserId);
        return proposals.Select(MapToResponseDto);
    }

    // ── Negociação ──────────────────────────────────────────────────────────

    public async Task<Result<ProposalResponseDto>> CounterProposalAsync(CounterProposalRequest request)
    {
        var result = await _proposalDomainService.CounterProposalAsync(
            request.CustomerUserId, request.ProposalId, request.CounterPrice, request.CounterDescription);
        if (result.IsFailure) return Result<ProposalResponseDto>.Failure(result.Error, result.ErrorCode);
        return Result<ProposalResponseDto>.Success(MapToResponseDto(result.Value));
    }

    public async Task<Result<ProposalResponseDto>> AcceptCounterAsync(AcceptCounterRequest request)
    {
        var result = await _proposalDomainService.AcceptCounterAsync(request.ProviderUserId, request.ProposalId);
        if (result.IsFailure) return Result<ProposalResponseDto>.Failure(result.Error, result.ErrorCode);
        return Result<ProposalResponseDto>.Success(MapToResponseDto(result.Value));
    }

    public async Task<Result<ProposalResponseDto>> RejectCounterAsync(RejectCounterRequest request)
    {
        var result = await _proposalDomainService.RejectCounterAsync(request.ProviderUserId, request.ProposalId);
        if (result.IsFailure) return Result<ProposalResponseDto>.Failure(result.Error, result.ErrorCode);
        return Result<ProposalResponseDto>.Success(MapToResponseDto(result.Value));
    }

    public async Task<Result<ChatMessageDto>> SendChatMessageAsync(SendChatMessageRequest request)
    {
        var proposal = await _proposalDomainService.GetByIdAsync(request.ProposalId);
        if (proposal is null)
            return Result<ChatMessageDto>.Failure("Proposta não encontrada.", "PROPOSAL_NOT_FOUND");

        if (proposal.ProposalStatus == ProposalStatus.Rejected)
            return Result<ChatMessageDto>.Failure("Não é possível enviar mensagens em propostas recusadas.", "PROPOSAL_REJECTED");

        // O chat persiste após o aceite até a conclusão ou cancelamento do serviço
        if (proposal.ProposalStatus == ProposalStatus.Accepted)
        {
            if (proposal.Service is not null &&
                (proposal.Service.ServiceStatus == ServiceStatus.Completed || proposal.Service.ServiceStatus == ServiceStatus.Cancelled))
            {
                return Result<ChatMessageDto>.Failure("O serviço já foi finalizado. O chat está encerrado.", "SERVICE_FINISHED");
            }
        }

        // Abre negociação se ainda estiver Pending
        if (proposal.ProposalStatus == ProposalStatus.Pending)
        {
            proposal.ProposalStatus = ProposalStatus.NegotiationOpen;
            await _proposalDomainService.UpdateAsync(proposal);
        }

        var message = await _chatMessageRepository.SendMessageAsync(
            request.ProposalId, request.SenderId, request.Content, request.IsFromProvider);

        var dto = MapMessageDto(message) with { ServiceId = proposal.ServiceId };
        return Result<ChatMessageDto>.Success(dto);
    }

    public async Task<IEnumerable<ChatMessageDto>> GetChatMessagesAsync(Guid proposalId)
    {
        var messages = await _chatMessageRepository.GetByProposalIdAsync(proposalId);
        return messages.Select(MapMessageDto);
    }

    public async Task<ProposalResponseDto?> GetActiveChatProposalByServiceIdAsync(Guid serviceId)
    {
        var proposals = (await _proposalDomainService.GetProposalsByServiceIdAsync(serviceId)).ToList();

        // 1. Proposta aceita (chat persistido da negociação ou novo chat para o serviço aceito)
        var accepted = proposals.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.Accepted);
        if (accepted is not null) return MapToResponseDto(accepted);

        // 2. Proposta em negociação
        var inNegotiation = proposals.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.NegotiationOpen);
        if (inNegotiation is not null) return MapToResponseDto(inNegotiation);

        // 3. Proposta pendente
        var pending = proposals.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.Pending);
        if (pending is not null) return MapToResponseDto(pending);

        return null;
    }

    // ── Mapping ────────────────────────────────────────────────────────────────

    private static ProposalResponseDto MapToResponseDto(Proposal proposal)
    {
        var financialVo = PriceProposalVo.Create(proposal.LaborPrice, proposal.MaterialsPrice, proposal.ProposedPrice);
        var providerName = proposal.Provider?.User?.Name ?? "Prestador";
        var providerPhoto = proposal.Provider?.User?.ProfilePicture;
        var providerRating = proposal.Provider?.AverageRating;
        var providerUserId = proposal.Provider?.UserId;

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
            CreatedAt: proposal.CreatedAt,
            CounterPrice: proposal.CounterPrice,
            CounterDescription: proposal.CounterDescription,
            CounterOfferedAt: proposal.CounterOfferedAt,
            LaborPrice: financialVo.LaborAmount,
            MaterialsPrice: financialVo.MaterialsAmount,
            ProviderPhoto: providerPhoto,
            ProviderRating: providerRating,
            ProviderUserId: providerUserId
        );
    }

    private static ChatMessageDto MapMessageDto(ChatMessage m) =>
        new(m.Id, m.ProposalId, m.SenderId, m.Content, m.IsFromProvider, m.SentAt);
}
