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
    Task<Result<ProposalResponseDto>> ProposePriceAsync(ProposePriceRequest request, Guid callerUserId, bool isAdmin);
    Task<Result<ProposalResponseDto>> AcceptProposalAsync(AcceptProposalRequest request);
    Task<Result<ProposalResponseDto>> AcceptProposalAsync(AcceptProposalRequest request, Guid callerUserId, bool isAdmin);
    Task<Result> RejectProposalAsync(RejectProposalRequest request);
    Task<Result> RejectProposalAsync(RejectProposalRequest request, Guid callerUserId, bool isAdmin);
    Task<ProposalResponseDto?> GetProposalByIdAsync(Guid id);
    Task<Result<ProposalResponseDto>> GetProposalByIdAsync(Guid id, Guid callerUserId, bool isAdmin);
    Task<IEnumerable<ProposalResponseDto>> GetProposalsByServiceIdAsync(Guid serviceId);
    Task<Result<IEnumerable<ProposalResponseDto>>> GetProposalsByServiceIdAsync(Guid serviceId, Guid callerUserId, bool isAdmin);
    Task<IEnumerable<ProposalResponseDto>> GetProposalsByProviderUserIdAsync(Guid providerUserId);
    Task<Result<IEnumerable<ProposalResponseDto>>> GetProposalsByProviderUserIdAsync(Guid providerUserId, Guid callerUserId, bool isAdmin);

    // ── Negociação ───────────────────────────────────────────────
    Task<Result<ProposalResponseDto>> CounterProposalAsync(CounterProposalRequest request);
    Task<Result<ProposalResponseDto>> CounterProposalAsync(CounterProposalRequest request, Guid callerUserId, bool isAdmin);
    Task<Result<ProposalResponseDto>> AcceptCounterAsync(AcceptCounterRequest request);
    Task<Result<ProposalResponseDto>> AcceptCounterAsync(AcceptCounterRequest request, Guid callerUserId, bool isAdmin);
    Task<Result<ProposalResponseDto>> RejectCounterAsync(RejectCounterRequest request);
    Task<Result<ProposalResponseDto>> RejectCounterAsync(RejectCounterRequest request, Guid callerUserId, bool isAdmin);
    Task<Result<ChatMessageDto>> SendChatMessageAsync(SendChatMessageRequest request);
    Task<Result<ChatMessageDto>> SendChatMessageAsync(SendChatMessageRequest request, Guid callerUserId, bool isAdmin);
    Task<IEnumerable<ChatMessageDto>> GetChatMessagesAsync(Guid proposalId);
    Task<Result<IEnumerable<ChatMessageDto>>> GetChatMessagesAsync(Guid proposalId, Guid callerUserId, bool isAdmin);
    Task<ProposalResponseDto?> GetActiveChatProposalByServiceIdAsync(Guid serviceId);
    Task<Result<ProposalResponseDto>> GetActiveChatProposalByServiceIdAsync(Guid serviceId, Guid callerUserId, bool isAdmin);
}

/// <summary>
/// Application Service in Clean Architecture.
/// Responsible for orchestrating use cases, security validations, domain services,
/// real-time notifications (WebSockets) and push notifications.
/// </summary>
public class ProposalApplicationService(
    IProposalDomainService proposalDomainService,
    IChatMessageRepository chatMessageRepository,
    IServiceRepository? serviceRepository = null,
    IAppointmentRepository? appointmentRepository = null,
    IBaseRepository<ServiceProvider>? providerRepository = null,
    IBaseRepository<Customer>? customerRepository = null,
    ITrackingNotificationService? trackingNotification = null,
    IChatNotificationService? chatNotification = null,
    IPushNotificationService? pushNotification = null,
    IWalletApplicationService? walletService = null,
    IEmailService? emailService = null
) : IProposalApplicationService
{
    private readonly IProposalDomainService _proposalDomainService = proposalDomainService;
    private readonly IChatMessageRepository _chatMessageRepository = chatMessageRepository;
    private readonly IServiceRepository? _serviceRepository = serviceRepository;
    private readonly IAppointmentRepository? _appointmentRepository = appointmentRepository;
    private readonly IBaseRepository<ServiceProvider>? _providerRepository = providerRepository;
    private readonly IBaseRepository<Customer>? _customerRepository = customerRepository;
    private readonly ITrackingNotificationService? _trackingNotification = trackingNotification;
    private readonly IChatNotificationService? _chatNotification = chatNotification;
    private readonly IPushNotificationService? _pushNotification = pushNotification;
    private readonly IWalletApplicationService? _walletService = walletService;
    private readonly IEmailService? _emailService = emailService;

    public async Task<Result<ProposalResponseDto>> ProposePriceAsync(ProposePriceRequest request)
    {
        var result = await _proposalDomainService.ProposePriceAsync(
            request.ProviderUserId, request.ServiceId, request.ProposedPrice,
            request.Description, request.EstimatedTime,
            request.LaborPrice, request.MaterialsPrice);
        if (result.IsFailure) return Result<ProposalResponseDto>.Failure(result.Error, result.ErrorCode);
        return Result<ProposalResponseDto>.Success(MapToResponseDto(result.Value));
    }

    public async Task<Result<ProposalResponseDto>> ProposePriceAsync(ProposePriceRequest request, Guid callerUserId, bool isAdmin)
    {
        var authCheck = await AuthorizeProviderRoleAsync(callerUserId, isAdmin);
        if (!authCheck.IsSuccess)
            return Result<ProposalResponseDto>.Failure(authCheck.Error!, authCheck.ErrorCode!);

        var secureRequest = request with { ProviderUserId = callerUserId };
        var result = await ProposePriceAsync(secureRequest);
        if (!result.IsSuccess || result.Value == null)
            return result;

        await NotifyTrackingAsync(request.ServiceId, "proposal_created", result.Value);
        await DispatchProposalPushNotificationAsync(request.ServiceId, result.Value);
        await SendProposalEmailAsync(request.ServiceId, result.Value.Id, ProposalEmailKind.Submitted, null);

        return result;
    }

    public async Task<Result<ProposalResponseDto>> AcceptProposalAsync(AcceptProposalRequest request)
    {
        var result = await _proposalDomainService.AcceptProposalAsync(request.CustomerUserId, request.ProposalId);
        if (result.IsFailure) return Result<ProposalResponseDto>.Failure(result.Error, result.ErrorCode);
        if (_walletService != null && result.Value != null)
        {
            await _walletService.HoldEscrowForServiceAsync(result.Value.ServiceId);
        }
        return Result<ProposalResponseDto>.Success(MapToResponseDto(result.Value));
    }

    public async Task<Result<ProposalResponseDto>> AcceptProposalAsync(AcceptProposalRequest request, Guid callerUserId, bool isAdmin)
    {
        var secureRequest = request with { CustomerUserId = callerUserId };
        var result = await AcceptProposalAsync(secureRequest);
        if (result.IsSuccess && result.Value != null)
        {
            await NotifyTrackingAsync(result.Value.ServiceId, "proposal_accepted", result.Value);
            await SendProposalEmailAsync(result.Value.ServiceId, result.Value.Id, ProposalEmailKind.Accepted, null);
            await NotifyProposalChatAsync(result.Value.Id, result.Value.ServiceId, "proposal_updated", result.Value);
        }
        return result;
    }

    public async Task<Result> RejectProposalAsync(RejectProposalRequest request)
        => await _proposalDomainService.RejectProposalAsync(request.CustomerUserId, request.ProposalId, request.Reason);

    public async Task<Result> RejectProposalAsync(RejectProposalRequest request, Guid callerUserId, bool isAdmin)
    {
        var secureRequest = request with { CustomerUserId = callerUserId };
        var result = await RejectProposalAsync(secureRequest);
        if (result.IsSuccess)
        {
            var prop = await GetProposalByIdAsync(request.ProposalId);
            if (prop != null)
            {
                await NotifyTrackingAsync(prop.ServiceId, "proposal_rejected", prop);
                await SendProposalEmailAsync(prop.ServiceId, prop.Id, ProposalEmailKind.Rejected, request.Reason);
                await NotifyProposalChatAsync(prop.Id, prop.ServiceId, "proposal_updated", prop);
            }
        }
        return result;
    }

    public async Task<ProposalResponseDto?> GetProposalByIdAsync(Guid id)
    {
        var proposal = await _proposalDomainService.GetByIdAsync(id);
        return proposal is null ? null : MapToResponseDto(proposal);
    }

    public async Task<Result<ProposalResponseDto>> GetProposalByIdAsync(Guid id, Guid callerUserId, bool isAdmin)
    {
        var proposal = await _proposalDomainService.GetByIdAsync(id);
        if (proposal == null)
        {
            return Result<ProposalResponseDto>.Failure("Proposta não encontrada.", "NOT_FOUND");
        }

        var isProvider = proposal.Provider?.UserId == callerUserId || proposal.ProviderId == callerUserId;
        var isCustomer = proposal.Service?.Customer?.UserId == callerUserId;

        if (!isAdmin && !isProvider && !isCustomer)
        {
            return Result<ProposalResponseDto>.Failure("Você não possui permissão para visualizar esta proposta.", "FORBIDDEN");
        }

        return Result<ProposalResponseDto>.Success(MapToResponseDto(proposal));
    }

    public async Task<IEnumerable<ProposalResponseDto>> GetProposalsByServiceIdAsync(Guid serviceId)
    {
        var proposals = await _proposalDomainService.GetProposalsByServiceIdAsync(serviceId);
        return proposals.Select(MapToResponseDto);
    }

    public async Task<Result<IEnumerable<ProposalResponseDto>>> GetProposalsByServiceIdAsync(Guid serviceId, Guid callerUserId, bool isAdmin)
    {
        var service = _serviceRepository != null ? await _serviceRepository.GetByIdWithDetailsAsync(serviceId) : null;
        var isCustomer = service?.Customer?.UserId == callerUserId;
        var isProvider = false;

        if (!isCustomer && _providerRepository != null)
        {
            var provider = (await _providerRepository.FindAsync(p => p.UserId == callerUserId)).FirstOrDefault();
            isProvider = provider != null;
        }

        if (!isAdmin && !isCustomer && !isProvider)
        {
            return Result<IEnumerable<ProposalResponseDto>>.Failure("Você não possui permissão para consultar propostas deste serviço.", "FORBIDDEN");
        }

        var proposals = await GetProposalsByServiceIdAsync(serviceId);
        if (!isAdmin && !isCustomer)
        {
            // Prestador vê apenas as suas próprias propostas
            proposals = proposals.Where(p => p.ProviderUserId == callerUserId);
        }

        return Result<IEnumerable<ProposalResponseDto>>.Success(proposals);
    }

    public async Task<IEnumerable<ProposalResponseDto>> GetProposalsByProviderUserIdAsync(Guid providerUserId)
    {
        var proposals = await _proposalDomainService.GetProposalsByProviderUserIdAsync(providerUserId);
        return proposals.Select(MapToResponseDto);
    }

    public async Task<Result<IEnumerable<ProposalResponseDto>>> GetProposalsByProviderUserIdAsync(Guid providerUserId, Guid callerUserId, bool isAdmin)
    {
        if (callerUserId != providerUserId && !isAdmin)
        {
            return Result<IEnumerable<ProposalResponseDto>>.Failure("Você não possui permissão para visualizar propostas de outro prestador.", "FORBIDDEN");
        }

        var list = await GetProposalsByProviderUserIdAsync(providerUserId);
        return Result<IEnumerable<ProposalResponseDto>>.Success(list);
    }

    // ── Negociação ──────────────────────────────────────────────────────────

    public async Task<Result<ProposalResponseDto>> CounterProposalAsync(CounterProposalRequest request)
    {
        var result = await _proposalDomainService.CounterProposalAsync(
            request.CustomerUserId, request.ProposalId, request.CounterPrice, request.CounterDescription);
        if (result.IsFailure) return Result<ProposalResponseDto>.Failure(result.Error, result.ErrorCode);
        return Result<ProposalResponseDto>.Success(MapToResponseDto(result.Value));
    }

    public async Task<Result<ProposalResponseDto>> CounterProposalAsync(CounterProposalRequest request, Guid callerUserId, bool isAdmin)
    {
        var secureRequest = request with { CustomerUserId = callerUserId };
        var result = await CounterProposalAsync(secureRequest);
        if (result.IsSuccess && result.Value != null)
        {
            await NotifyTrackingAsync(result.Value.ServiceId, "proposal_countered", result.Value);
            await NotifyProposalChatAsync(result.Value.Id, result.Value.ServiceId, "proposal_updated", result.Value);
        }
        return result;
    }

    public async Task<Result<ProposalResponseDto>> AcceptCounterAsync(AcceptCounterRequest request)
    {
        var result = await _proposalDomainService.AcceptCounterAsync(request.ProviderUserId, request.ProposalId);
        if (result.IsFailure) return Result<ProposalResponseDto>.Failure(result.Error, result.ErrorCode);
        if (_walletService != null && result.Value != null)
        {
            await _walletService.HoldEscrowForServiceAsync(result.Value.ServiceId);
        }
        return Result<ProposalResponseDto>.Success(MapToResponseDto(result.Value));
    }

    public async Task<Result<ProposalResponseDto>> AcceptCounterAsync(AcceptCounterRequest request, Guid callerUserId, bool isAdmin)
    {
        var secureRequest = request with { ProviderUserId = callerUserId };
        var result = await AcceptCounterAsync(secureRequest);
        if (result.IsSuccess && result.Value != null)
        {
            await NotifyTrackingAsync(result.Value.ServiceId, "counter_accepted", result.Value);
            await SendProposalEmailAsync(result.Value.ServiceId, result.Value.Id, ProposalEmailKind.Accepted, null);
            await NotifyProposalChatAsync(result.Value.Id, result.Value.ServiceId, "proposal_updated", result.Value);
        }
        return result;
    }

    public async Task<Result<ProposalResponseDto>> RejectCounterAsync(RejectCounterRequest request)
    {
        var result = await _proposalDomainService.RejectCounterAsync(request.ProviderUserId, request.ProposalId);
        if (result.IsFailure) return Result<ProposalResponseDto>.Failure(result.Error, result.ErrorCode);
        return Result<ProposalResponseDto>.Success(MapToResponseDto(result.Value));
    }

    public async Task<Result<ProposalResponseDto>> RejectCounterAsync(RejectCounterRequest request, Guid callerUserId, bool isAdmin)
    {
        var secureRequest = request with { ProviderUserId = callerUserId };
        var result = await RejectCounterAsync(secureRequest);
        if (result.IsSuccess && result.Value != null)
        {
            await NotifyTrackingAsync(result.Value.ServiceId, "counter_rejected", result.Value);
            await NotifyProposalChatAsync(result.Value.Id, result.Value.ServiceId, "proposal_updated", result.Value);
        }
        return result;
    }

    public async Task<Result<ChatMessageDto>> SendChatMessageAsync(SendChatMessageRequest request)
    {
        var proposal = await _proposalDomainService.GetByIdAsync(request.ProposalId);
        if (proposal is null)
            return Result<ChatMessageDto>.Failure("Proposta não encontrada.", "PROPOSAL_NOT_FOUND");

        var stateCheck = await ValidateAndTransitionProposalChatStateAsync(proposal);
        if (!stateCheck.IsSuccess)
            return Result<ChatMessageDto>.Failure(stateCheck.Error!, stateCheck.ErrorCode!);

        var message = await _chatMessageRepository.SendMessageAsync(
            request.ProposalId,
            request.SenderId,
            request.Content,
            request.IsFromProvider
        );

        return Result<ChatMessageDto>.Success(new ChatMessageDto(
            message.Id,
            message.ProposalId ?? Guid.Empty,
            message.SenderId,
            message.Content,
            message.IsFromProvider,
            message.SentAt,
            proposal.ServiceId
        ));
    }

    public async Task<Result<ChatMessageDto>> SendChatMessageAsync(SendChatMessageRequest request, Guid callerUserId, bool isAdmin)
    {
        var proposal = await _proposalDomainService.GetByIdAsync(request.ProposalId);
        if (proposal == null)
            return Result<ChatMessageDto>.Failure("Proposta não encontrada.", "PROPOSAL_NOT_FOUND");

        var authCheck = AuthorizeProposalChatParticipant(proposal, callerUserId, isAdmin);
        if (!authCheck.IsSuccess)
            return Result<ChatMessageDto>.Failure(authCheck.Error!, authCheck.ErrorCode!);

        var (isCustomer, isProvider) = authCheck.Value;

        var secureRequest = request with
        {
            SenderId = callerUserId,
            IsFromProvider = isProvider && !isCustomer
        };

        var result = await SendChatMessageAsync(secureRequest);
        if (result.IsSuccess && result.Value != null && _chatNotification != null)
        {
            await _chatNotification.NotifyChatUpdateAsync(request.ProposalId, result.Value.ServiceId, "new_message", result.Value);
        }
        return result;
    }

    public async Task<IEnumerable<ChatMessageDto>> GetChatMessagesAsync(Guid proposalId)
    {
        var messages = await _chatMessageRepository.GetByProposalIdAsync(proposalId);
        return messages.Select(m => new ChatMessageDto(
            m.Id,
            m.ProposalId ?? Guid.Empty,
            m.SenderId,
            m.Content,
            m.IsFromProvider,
            m.SentAt,
            m.ServiceId
        ));
    }

    public async Task<Result<IEnumerable<ChatMessageDto>>> GetChatMessagesAsync(Guid proposalId, Guid callerUserId, bool isAdmin)
    {
        var proposal = await _proposalDomainService.GetByIdAsync(proposalId);
        if (proposal == null)
            return Result<IEnumerable<ChatMessageDto>>.Failure("Proposta não encontrada.", "NOT_FOUND");

        var isCustomer = proposal.Service?.Customer?.UserId == callerUserId;
        var isProvider = proposal.Provider?.UserId == callerUserId || proposal.ProviderId == callerUserId;

        if (!isAdmin && !isCustomer && !isProvider)
        {
            return Result<IEnumerable<ChatMessageDto>>.Failure("Você não possui permissão para visualizar este chat.", "FORBIDDEN");
        }

        var list = await GetChatMessagesAsync(proposalId);
        return Result<IEnumerable<ChatMessageDto>>.Success(list);
    }

    public async Task<ProposalResponseDto?> GetActiveChatProposalByServiceIdAsync(Guid serviceId)
    {
        var proposals = (await _proposalDomainService.GetProposalsByServiceIdAsync(serviceId)).ToList();

        var accepted = proposals.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.Accepted);
        if (accepted is not null) return MapToResponseDto(accepted);

        var countered = proposals.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.CounterOffered);
        if (countered is not null) return MapToResponseDto(countered);

        var inNegotiation = proposals.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.NegotiationOpen);
        if (inNegotiation is not null) return MapToResponseDto(inNegotiation);

        var pending = proposals.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.Pending);
        if (pending is not null) return MapToResponseDto(pending);

        var rejected = proposals.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.Rejected);
        if (rejected is not null) return MapToResponseDto(rejected);

        return null;
    }

    public async Task<Result<ProposalResponseDto>> GetActiveChatProposalByServiceIdAsync(Guid serviceId, Guid callerUserId, bool isAdmin)
    {
        var service = _serviceRepository != null ? await _serviceRepository.GetByIdWithDetailsAsync(serviceId) : null;
        if (service == null)
        {
            var directProposal = await _proposalDomainService.GetByIdAsync(serviceId);
            if (directProposal != null)
            {
                var isPropProvider = directProposal.Provider?.UserId == callerUserId || directProposal.ProviderId == callerUserId;
                var isPropCustomer = directProposal.Service?.Customer?.UserId == callerUserId;
                if (!isAdmin && !isPropProvider && !isPropCustomer)
                {
                    return Result<ProposalResponseDto>.Failure("Você não possui permissão para acessar o chat desta proposta.", "FORBIDDEN");
                }
                return Result<ProposalResponseDto>.Success(MapToResponseDto(directProposal));
            }

            if (_serviceRepository != null)
            {
                return Result<ProposalResponseDto>.Failure("Nenhum chat ativo encontrado para este serviço.", "NOT_FOUND");
            }
        }

        var isCustomer = service?.Customer?.UserId == callerUserId;
        var isProvider = service != null && (service.Appointment?.Provider?.UserId == callerUserId || service.Proposals.Any(p => p.Provider?.UserId == callerUserId || p.ProviderId == callerUserId));

        if (_serviceRepository != null && !isAdmin && !isCustomer && !isProvider)
        {
            return Result<ProposalResponseDto>.Failure("Você não possui permissão para acessar o chat deste serviço.", "FORBIDDEN");
        }

        if (service != null && isProvider && !isCustomer && !isAdmin)
        {
            var providerProposal = service.Proposals.FirstOrDefault(p => p.Provider?.UserId == callerUserId || p.ProviderId == callerUserId);
            if (providerProposal != null)
            {
                return Result<ProposalResponseDto>.Success(MapToResponseDto(providerProposal));
            }
        }

        var proposal = await GetActiveChatProposalByServiceIdAsync(serviceId);
        return proposal != null 
            ? Result<ProposalResponseDto>.Success(proposal)
            : Result<ProposalResponseDto>.Failure("Nenhum chat ativo encontrado para este serviço.", "NOT_FOUND");
    }

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
            ProviderUserId: providerUserId,
            ServiceStatus: proposal.Service?.ServiceStatus.ToString()
        );
    }

    private async Task<Result<bool>> AuthorizeProviderRoleAsync(Guid callerUserId, bool isAdmin)
    {
        if (isAdmin || _providerRepository == null) return Result<bool>.Success(true);

        var isProvider = (await _providerRepository.FindAsync(p => p.UserId == callerUserId)).Any();
        if (!isProvider)
            return Result<bool>.Failure("Apenas prestadores de serviço podem enviar propostas.", "FORBIDDEN");

        return Result<bool>.Success(true);
    }

    private static Result<(bool isCustomer, bool isProvider)> AuthorizeProposalChatParticipant(
        Proposal proposal,
        Guid callerUserId,
        bool isAdmin)
    {
        var isCustomer = proposal.Service?.Customer?.UserId == callerUserId;
        var isProvider = proposal.Provider?.UserId == callerUserId || proposal.ProviderId == callerUserId;

        if (!isAdmin && !isCustomer && !isProvider)
            return Result<(bool, bool)>.Failure("Você não possui permissão para enviar mensagens nesta proposta.", "FORBIDDEN");

        return Result<(bool, bool)>.Success((isCustomer, isProvider));
    }

    private async Task<Result<bool>> ValidateAndTransitionProposalChatStateAsync(Proposal proposal)
    {
        if (proposal.ProposalStatus == ProposalStatus.Rejected)
            return Result<bool>.Failure("Não é possível enviar mensagens em propostas recusadas.", "PROPOSAL_REJECTED");

        if (proposal.Service is not null &&
            (proposal.Service.ServiceStatus == ServiceStatus.Completed || proposal.Service.ServiceStatus == ServiceStatus.Cancelled))
        {
            return Result<bool>.Failure("O serviço já foi finalizado. O chat está encerrado.", "SERVICE_FINISHED");
        }

        if (proposal.ProposalStatus == ProposalStatus.Pending)
        {
            proposal.ProposalStatus = ProposalStatus.NegotiationOpen;
            await _proposalDomainService.UpdateAsync(proposal);
        }

        return Result<bool>.Success(true);
    }

    private enum ProposalEmailKind { Submitted, Accepted, Rejected }

    /// <summary>Best-effort transactional e-mail handled safely by IEmailService.</summary>
    private async Task SendProposalEmailAsync(Guid serviceId, Guid proposalId, ProposalEmailKind kind, string? reason)
    {
        if (_emailService == null || _serviceRepository == null) return;

        var service = await _serviceRepository.GetByIdWithDetailsAsync(serviceId);
        var proposal = service?.Proposals?.FirstOrDefault(p => p.Id == proposalId);
        if (service == null || proposal == null) return;

        var clientUser = service.Customer?.User;
        var providerUser = proposal.Provider?.User;

        switch (kind)
        {
            case ProposalEmailKind.Submitted when !string.IsNullOrWhiteSpace(clientUser?.Email):
                await _emailService.SendProposalNotificationAsync(
                    clientUser!.Email, clientUser.Name, providerUser?.Name ?? "Prestador",
                    service.Title, proposal.ProposedPrice, proposal.Description);
                break;
            case ProposalEmailKind.Accepted:
                if (!string.IsNullOrWhiteSpace(providerUser?.Email))
                {
                    await _emailService.SendProposalAcceptedNotificationAsync(
                        providerUser!.Email, providerUser.Name, clientUser?.Name ?? "Cliente",
                        service.Title, proposal.ProposedPrice, string.Empty);
                }
                if (!string.IsNullOrWhiteSpace(clientUser?.Email))
                {
                    await _emailService.SendProviderAcceptedNotificationAsync(
                        clientUser!.Email, clientUser.Name, providerUser?.Name ?? "Prestador",
                        service.Title, proposal.ProposedPrice, service.Appointment?.ScheduledDate);
                }
                break;
            case ProposalEmailKind.Rejected when !string.IsNullOrWhiteSpace(providerUser?.Email):
                await _emailService.SendProposalRejectedNotificationAsync(
                    providerUser!.Email, providerUser.Name, service.Title, reason);
                break;
        }
    }

    private async Task NotifyTrackingAsync(Guid serviceId, string eventType, object? payload)
    {
        if (_trackingNotification != null)
            await _trackingNotification.NotifyServiceUpdateAsync(serviceId, eventType, payload);
    }

    private async Task NotifyProposalChatAsync(Guid proposalId, Guid serviceId, string eventType, object? payload)
    {
        if (_chatNotification != null)
            await _chatNotification.NotifyChatUpdateAsync(proposalId, serviceId, eventType, payload);
    }

    private async Task DispatchProposalPushNotificationAsync(Guid serviceId, ProposalResponseDto proposal)
    {
        if (_pushNotification == null || _serviceRepository == null) return;

        try
        {
            var service = await _serviceRepository.GetByIdWithDetailsAsync(serviceId);
            var customerUserId = service?.Customer?.UserId;
            if (customerUserId == null) return;

            var targetUserId = customerUserId.Value;
            var targetServiceId = service!.Id;
            var priceFormatted = proposal.ProposedPrice.ToString("C", new System.Globalization.CultureInfo("pt-BR"));
            var provName = string.IsNullOrWhiteSpace(proposal.ProviderName) ? "Um profissional" : proposal.ProviderName;

            await _pushNotification.SendToUserAsync(
                targetUserId,
                "💰 Nova proposta recebida!",
                $"{provName} enviou uma proposta de {priceFormatted} para seu chamado.",
                new
                {
                    type = "new_proposal",
                    serviceId = targetServiceId,
                    proposalId = proposal.Id
                }
            );
        }
        catch { }
    }
}
