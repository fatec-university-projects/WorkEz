using WorkEz.Application.DTOs;
using WorkEz.Application.ValueObjects;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Interfaces;

namespace WorkEz.Application.Services;

/// <summary>
/// Interface Segregation Principle (ISP) & Single Responsibility Principle (SRP):
/// Chat is a distinct domain and application concern, completely abstracted from Proposal logic.
/// </summary>
public interface IChatApplicationService
{
    Task<Result<ChatMessageResponseDto>> SendMessageAsync(SendChatMessageCommand command);
    Task<IEnumerable<ChatMessageResponseDto>> GetMessagesByProposalIdAsync(Guid proposalId);
    Task<IEnumerable<ChatMessageResponseDto>> GetMessagesByServiceIdAsync(Guid serviceId);
    Task<ProposalResponseDto?> GetActiveChatProposalByServiceIdAsync(Guid serviceId);
}

/// <summary>
/// Chat Application Service in Clean Architecture.
/// Orchestrates chat use cases independently from proposal workflows.
/// </summary>
public class ChatApplicationService(
    IChatMessageRepository chatMessageRepository,
    IProposalRepository proposalRepository,
    IServiceRepository serviceRepository
) : IChatApplicationService
{
    private readonly IChatMessageRepository _chatMessageRepository = chatMessageRepository;
    private readonly IProposalRepository _proposalRepository = proposalRepository;
    private readonly IServiceRepository _serviceRepository = serviceRepository;

    public async Task<Result<ChatMessageResponseDto>> SendMessageAsync(SendChatMessageCommand command)
    {
        if (string.IsNullOrWhiteSpace(command.Content))
            return Result<ChatMessageResponseDto>.Failure("O conteúdo da mensagem não pode ser vazio.", "EMPTY_CONTENT");

        if (command.SenderId == Guid.Empty)
            return Result<ChatMessageResponseDto>.Failure("Remetente inválido.", "INVALID_SENDER");

        Guid? resolvedServiceId = command.ServiceId;
        Guid? resolvedProposalId = command.ProposalId;

        // Regras de negócio quando o chat está vinculado a uma Proposta
        if (command.ProposalId.HasValue && command.ProposalId.Value != Guid.Empty)
        {
            var proposal = await _proposalRepository.GetByIdAsync(command.ProposalId.Value);
            if (proposal is null)
                return Result<ChatMessageResponseDto>.Failure("Proposta não encontrada.", "PROPOSAL_NOT_FOUND");

            resolvedServiceId ??= proposal.ServiceId;

            if (proposal.ProposalStatus == ProposalStatus.Rejected)
                return Result<ChatMessageResponseDto>.Failure("Não é possível enviar mensagens em propostas recusadas.", "PROPOSAL_REJECTED");

            // Se a proposta foi aceita, verificar se o serviço já terminou
            if (proposal.ProposalStatus == ProposalStatus.Accepted)
            {
                var service = proposal.Service ?? (resolvedServiceId.HasValue ? await _serviceRepository.GetByIdAsync(resolvedServiceId.Value) : null);
                if (service is not null && (service.ServiceStatus == ServiceStatus.Completed || service.ServiceStatus == ServiceStatus.Cancelled))
                {
                    return Result<ChatMessageResponseDto>.Failure("O serviço já foi finalizado. O chat está encerrado.", "SERVICE_FINISHED");
                }
            }

            // Se proposta ainda estiver Pendente, abre negociação
            if (proposal.ProposalStatus == ProposalStatus.Pending)
            {
                proposal.ProposalStatus = ProposalStatus.NegotiationOpen;
                _proposalRepository.Update(proposal);
                await _proposalRepository.SaveChangesAsync();
            }
        }
        else if (command.ServiceId.HasValue && command.ServiceId.Value != Guid.Empty)
        {
            var service = await _serviceRepository.GetByIdAsync(command.ServiceId.Value);
            if (service is null)
                return Result<ChatMessageResponseDto>.Failure("Serviço não encontrado.", "SERVICE_NOT_FOUND");

            if (service.ServiceStatus == ServiceStatus.Completed || service.ServiceStatus == ServiceStatus.Cancelled)
                return Result<ChatMessageResponseDto>.Failure("O serviço já foi finalizado. O chat está encerrado.", "SERVICE_FINISHED");
        }
        else
        {
            return Result<ChatMessageResponseDto>.Failure("A mensagem deve estar vinculada a uma proposta ou a um serviço.", "TARGET_REQUIRED");
        }

        var message = await _chatMessageRepository.SendMessageAsync(
            resolvedProposalId,
            resolvedServiceId,
            command.SenderId,
            command.Content.Trim(),
            command.IsFromProvider
        );

        return Result<ChatMessageResponseDto>.Success(MapToResponseDto(message));
    }

    public async Task<IEnumerable<ChatMessageResponseDto>> GetMessagesByProposalIdAsync(Guid proposalId)
    {
        var messages = await _chatMessageRepository.GetByProposalIdAsync(proposalId);
        return messages.Select(MapToResponseDto);
    }

    public async Task<IEnumerable<ChatMessageResponseDto>> GetMessagesByServiceIdAsync(Guid serviceId)
    {
        var messages = await _chatMessageRepository.GetByServiceIdAsync(serviceId);
        return messages.Select(MapToResponseDto);
    }

    public async Task<ProposalResponseDto?> GetActiveChatProposalByServiceIdAsync(Guid serviceId)
    {
        var proposals = (await _proposalRepository.GetProposalsByServiceIdAsync(serviceId)).ToList();

        // 1. Proposta aceita (chat persistido da negociação ou pós-aceite)
        var accepted = proposals.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.Accepted);
        if (accepted is not null) return MapProposalToDto(accepted);

        // 2. Proposta em negociação
        var inNegotiation = proposals.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.NegotiationOpen);
        if (inNegotiation is not null) return MapProposalToDto(inNegotiation);

        // 3. Proposta pendente
        var pending = proposals.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.Pending);
        if (pending is not null) return MapProposalToDto(pending);

        return null;
    }

    private static ChatMessageResponseDto MapToResponseDto(ChatMessage m) =>
        new(
            Id: m.Id,
            ProposalId: m.ProposalId,
            ServiceId: m.ServiceId,
            SenderId: m.SenderId,
            Content: m.Content,
            IsFromProvider: m.IsFromProvider,
            SentAt: m.SentAt
        );

    private static ProposalResponseDto MapProposalToDto(Proposal proposal)
    {
        var financialVo = PriceProposalVo.Create(proposal.LaborPrice, proposal.MaterialsPrice, proposal.ProposedPrice);
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
            CreatedAt: proposal.CreatedAt,
            CounterPrice: proposal.CounterPrice,
            CounterDescription: proposal.CounterDescription,
            CounterOfferedAt: proposal.CounterOfferedAt,
            LaborPrice: financialVo.LaborAmount,
            MaterialsPrice: financialVo.MaterialsAmount
        );
    }
}
