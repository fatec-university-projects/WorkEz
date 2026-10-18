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
    Task<Result<ChatMessageResponseDto>> SendMessageAsync(SendChatMessageCommand command, Guid callerUserId, bool isAdmin);
    Task<IEnumerable<ChatMessageResponseDto>> GetMessagesByProposalIdAsync(Guid proposalId);
    Task<Result<IEnumerable<ChatMessageResponseDto>>> GetMessagesByProposalIdAsync(Guid proposalId, Guid callerUserId, bool isAdmin);
    Task<IEnumerable<ChatMessageResponseDto>> GetMessagesByServiceIdAsync(Guid serviceId);
    Task<Result<IEnumerable<ChatMessageResponseDto>>> GetMessagesByServiceIdAsync(Guid serviceId, Guid callerUserId, bool isAdmin);
    Task<ProposalResponseDto?> GetActiveChatProposalByServiceIdAsync(Guid serviceId);
    Task<Result<ProposalResponseDto>> GetActiveChatProposalByServiceIdAsync(Guid serviceId, Guid callerUserId, bool isAdmin);
}

/// <summary>
/// Chat Application Service in Clean Architecture.
/// Orchestrates chat use cases, authorization, WebSockets and push notifications.
/// </summary>
public class ChatApplicationService(
    IChatMessageRepository chatMessageRepository,
    IProposalRepository proposalRepository,
    IServiceRepository serviceRepository,
    IAppointmentRepository? appointmentRepository = null,
    IBaseRepository<Customer>? customerRepository = null,
    IBaseRepository<ServiceProvider>? providerRepository = null,
    IBaseRepository<User>? userRepository = null,
    IChatNotificationService? chatNotification = null,
    IPushNotificationService? pushNotification = null
) : IChatApplicationService
{
    private readonly IChatMessageRepository _chatMessageRepository = chatMessageRepository;
    private readonly IProposalRepository _proposalRepository = proposalRepository;
    private readonly IServiceRepository _serviceRepository = serviceRepository;
    private readonly IAppointmentRepository? _appointmentRepository = appointmentRepository;
    private readonly IBaseRepository<Customer>? _customerRepository = customerRepository;
    private readonly IBaseRepository<ServiceProvider>? _providerRepository = providerRepository;
    private readonly IBaseRepository<User>? _userRepository = userRepository;
    private readonly IChatNotificationService? _chatNotification = chatNotification;
    private readonly IPushNotificationService? _pushNotification = pushNotification;

    public Task<Result<ChatMessageResponseDto>> SendMessageAsync(SendChatMessageCommand command)
        => SendMessageInternalAsync(command);

    public async Task<Result<ChatMessageResponseDto>> SendMessageAsync(
        SendChatMessageCommand command,
        Guid callerUserId,
        bool isAdmin)
    {
        var authResult = await AuthorizeSenderAsync(command.ProposalId, command.ServiceId, callerUserId, isAdmin);
        if (!authResult.IsSuccess)
            return Result<ChatMessageResponseDto>.Failure(authResult.Error!, authResult.ErrorCode!);

        var (isCustomer, isProvider) = authResult.Value;

        var secureCommand = command with
        {
            SenderId = callerUserId,
            IsFromProvider = isProvider && !isCustomer
        };

        var sendResult = await SendMessageInternalAsync(secureCommand);
        if (!sendResult.IsSuccess || sendResult.Value is null)
            return sendResult;

        var messageDto = sendResult.Value;
        await NotifyRealtimeMessageAsync(messageDto);
        DispatchPushNotificationInBackground(messageDto, secureCommand.Content, callerUserId, secureCommand.IsFromProvider);

        return sendResult;
    }

    private async Task<Result<ChatMessageResponseDto>> SendMessageInternalAsync(SendChatMessageCommand command)
    {
        var validationResult = ValidateCommandPayload(command);
        if (!validationResult.IsSuccess)
            return Result<ChatMessageResponseDto>.Failure(validationResult.Error!, validationResult.ErrorCode!);

        var targetResult = await ValidateAndResolveTargetAsync(command.ProposalId, command.ServiceId);
        if (!targetResult.IsSuccess)
            return Result<ChatMessageResponseDto>.Failure(targetResult.Error!, targetResult.ErrorCode!);

        var (resolvedProposalId, resolvedServiceId) = targetResult.Value;

        var message = await _chatMessageRepository.SendMessageAsync(
            resolvedProposalId,
            resolvedServiceId,
            command.SenderId,
            command.Content.Trim(),
            command.IsFromProvider
        );

        return Result<ChatMessageResponseDto>.Success(MapToResponseDto(message));
    }

    private async Task<Result<(bool isCustomer, bool isProvider)>> AuthorizeSenderAsync(
        Guid? proposalId,
        Guid? serviceId,
        Guid callerUserId,
        bool isAdmin)
    {
        if (!proposalId.HasValue && !serviceId.HasValue)
            return Result<(bool, bool)>.Failure("ProposalId ou ServiceId deve ser informado.", "TARGET_REQUIRED");

        var (isCustomer, isProvider) = await CheckParticipationAsync(proposalId, serviceId, callerUserId);
        if (!isAdmin && !isCustomer && !isProvider)
            return Result<(bool, bool)>.Failure("Você não possui permissão para enviar mensagens neste chat.", "FORBIDDEN");

        return Result<(bool, bool)>.Success((isCustomer, isProvider));
    }

    private static Result<bool> ValidateCommandPayload(SendChatMessageCommand command)
    {
        if (string.IsNullOrWhiteSpace(command.Content))
            return Result<bool>.Failure("O conteúdo da mensagem não pode ser vazio.", "EMPTY_CONTENT");

        if (command.SenderId == Guid.Empty)
            return Result<bool>.Failure("Remetente inválido.", "INVALID_SENDER");

        return Result<bool>.Success(true);
    }

    private async Task<Result<(Guid? proposalId, Guid? serviceId)>> ValidateAndResolveTargetAsync(Guid? proposalId, Guid? serviceId)
    {
        if (proposalId.HasValue && proposalId.Value != Guid.Empty)
            return await ValidateProposalChatTargetAsync(proposalId.Value, serviceId);

        if (serviceId.HasValue && serviceId.Value != Guid.Empty)
            return await ValidateServiceChatTargetAsync(serviceId.Value);

        return Result<(Guid?, Guid?)>.Failure("A mensagem deve estar vinculada a uma proposta ou a um serviço.", "TARGET_REQUIRED");
    }

    private async Task<Result<(Guid? proposalId, Guid? serviceId)>> ValidateProposalChatTargetAsync(Guid proposalId, Guid? serviceId)
    {
        var proposal = await _proposalRepository.GetByIdAsync(proposalId);
        if (proposal is null)
            return Result<(Guid?, Guid?)>.Failure("Proposta não encontrada.", "PROPOSAL_NOT_FOUND");

        var resolvedServiceId = serviceId ?? proposal.ServiceId;

        if (proposal.ProposalStatus == ProposalStatus.Rejected)
            return Result<(Guid?, Guid?)>.Failure("Não é possível enviar mensagens em propostas recusadas.", "PROPOSAL_REJECTED");

        if (proposal.ProposalStatus == ProposalStatus.Accepted)
        {
            var service = proposal.Service ?? await _serviceRepository.GetByIdAsync(resolvedServiceId);
            if (service is not null && (service.ServiceStatus == ServiceStatus.Completed || service.ServiceStatus == ServiceStatus.Cancelled))
            {
                return Result<(Guid?, Guid?)>.Failure("O serviço já foi finalizado. O chat está encerrado.", "SERVICE_FINISHED");
            }
        }

        if (proposal.ProposalStatus == ProposalStatus.Pending)
        {
            proposal.ProposalStatus = ProposalStatus.NegotiationOpen;
            _proposalRepository.Update(proposal);
            await _proposalRepository.SaveChangesAsync();
        }

        return Result<(Guid?, Guid?)>.Success((proposalId, resolvedServiceId));
    }

    private async Task<Result<(Guid? proposalId, Guid? serviceId)>> ValidateServiceChatTargetAsync(Guid serviceId)
    {
        var service = await _serviceRepository.GetByIdAsync(serviceId);
        if (service is null)
            return Result<(Guid?, Guid?)>.Failure("Serviço não encontrado.", "SERVICE_NOT_FOUND");

        if (service.ServiceStatus == ServiceStatus.Completed || service.ServiceStatus == ServiceStatus.Cancelled)
            return Result<(Guid?, Guid?)>.Failure("O serviço já foi finalizado. O chat está encerrado.", "SERVICE_FINISHED");

        return Result<(Guid?, Guid?)>.Success((null, serviceId));
    }

    private async Task NotifyRealtimeMessageAsync(ChatMessageResponseDto msg)
    {
        if (_chatNotification != null && (msg.ProposalId.HasValue || msg.ServiceId.HasValue))
        {
            var targetProposalId = msg.ProposalId ?? Guid.Empty;
            await _chatNotification.NotifyChatUpdateAsync(targetProposalId, msg.ServiceId, "new_message", msg);
        }
    }

    private void DispatchPushNotificationInBackground(
        ChatMessageResponseDto msg,
        string content,
        Guid callerUserId,
        bool isFromProvider)
    {
        if (_pushNotification == null) return;

        _ = Task.Run(async () =>
        {
            try
            {
                await SendPushNotificationToRecipientAsync(msg, content, callerUserId, isFromProvider);
            }
            catch
            {
                // Falha em notificação push em background não deve quebrar o fluxo
            }
        });
    }

    private async Task SendPushNotificationToRecipientAsync(
        ChatMessageResponseDto msg,
        string content,
        Guid callerUserId,
        bool isFromProvider)
    {
        var recipientUserId = await ResolveRecipientUserIdAsync(msg.ProposalId, msg.ServiceId, isFromProvider);
        if (!recipientUserId.HasValue || recipientUserId.Value == Guid.Empty || recipientUserId.Value == callerUserId)
            return;

        var senderName = await ResolveSenderDisplayNameAsync(callerUserId);
        var preview = content.Length > 80 ? content[..77] + "..." : content;

        await _pushNotification!.SendToUserAsync(
            recipientUserId.Value,
            $"💬 Mensagem de {senderName}",
            preview,
            new
            {
                type = "chat_message",
                proposalId = msg.ProposalId,
                serviceId = msg.ServiceId,
                senderName = senderName
            }
        );
    }

    private async Task<string> ResolveSenderDisplayNameAsync(Guid senderUserId)
    {
        if (_userRepository != null)
        {
            var senderUser = await _userRepository.GetByIdAsync(senderUserId);
            if (!string.IsNullOrWhiteSpace(senderUser?.Name))
                return senderUser.Name;
        }
        return "Nova mensagem";
    }

    public async Task<IEnumerable<ChatMessageResponseDto>> GetMessagesByProposalIdAsync(Guid proposalId)
    {
        var messages = await _chatMessageRepository.GetByProposalIdAsync(proposalId);
        return messages.Select(MapToResponseDto);
    }

    public async Task<Result<IEnumerable<ChatMessageResponseDto>>> GetMessagesByProposalIdAsync(Guid proposalId, Guid callerUserId, bool isAdmin)
    {
        var (isCustomer, isProvider) = await CheckParticipationAsync(proposalId, null, callerUserId);
        if (!isAdmin && !isCustomer && !isProvider)
        {
            return Result<IEnumerable<ChatMessageResponseDto>>.Failure("Você não possui permissão para visualizar mensagens desta proposta.", "FORBIDDEN");
        }

        var list = await GetMessagesByProposalIdAsync(proposalId);
        return Result<IEnumerable<ChatMessageResponseDto>>.Success(list);
    }

    public async Task<IEnumerable<ChatMessageResponseDto>> GetMessagesByServiceIdAsync(Guid serviceId)
    {
        var messages = await _chatMessageRepository.GetByServiceIdAsync(serviceId);
        return messages.Select(MapToResponseDto);
    }

    public async Task<Result<IEnumerable<ChatMessageResponseDto>>> GetMessagesByServiceIdAsync(Guid serviceId, Guid callerUserId, bool isAdmin)
    {
        var (isCustomer, isProvider) = await CheckParticipationAsync(null, serviceId, callerUserId);
        if (!isAdmin && !isCustomer && !isProvider)
        {
            return Result<IEnumerable<ChatMessageResponseDto>>.Failure("Você não possui permissão para visualizar mensagens deste serviço.", "FORBIDDEN");
        }

        var list = await GetMessagesByServiceIdAsync(serviceId);
        return Result<IEnumerable<ChatMessageResponseDto>>.Success(list);
    }

    public async Task<ProposalResponseDto?> GetActiveChatProposalByServiceIdAsync(Guid serviceId)
    {
        var proposals = (await _proposalRepository.GetProposalsByServiceIdAsync(serviceId)).ToList();

        var accepted = proposals.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.Accepted);
        if (accepted is not null) return MapProposalToDto(accepted);

        var inNegotiation = proposals.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.NegotiationOpen);
        if (inNegotiation is not null) return MapProposalToDto(inNegotiation);

        var pending = proposals.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.Pending);
        if (pending is not null) return MapProposalToDto(pending);

        return null;
    }

    public async Task<Result<ProposalResponseDto>> GetActiveChatProposalByServiceIdAsync(Guid serviceId, Guid callerUserId, bool isAdmin)
    {
        var (isCustomer, isProvider) = await CheckParticipationAsync(null, serviceId, callerUserId);
        if (!isAdmin && !isCustomer && !isProvider)
        {
            return Result<ProposalResponseDto>.Failure("Você não possui permissão para acessar o chat deste serviço.", "FORBIDDEN");
        }

        var proposal = await GetActiveChatProposalByServiceIdAsync(serviceId);
        return proposal != null 
            ? Result<ProposalResponseDto>.Success(proposal) 
            : Result<ProposalResponseDto>.Failure("Nenhum chat ativo encontrado para este serviço.", "NOT_FOUND");
    }

    private async Task<(bool isCustomer, bool isProvider)> CheckParticipationAsync(Guid? proposalId, Guid? serviceId, Guid userId)
    {
        if (proposalId.HasValue && proposalId.Value != Guid.Empty)
        {
            var proposal = await _proposalRepository.GetByIdWithServiceAndProviderAsync(proposalId.Value) 
                ?? await _proposalRepository.GetByIdAsync(proposalId.Value);

            if (proposal != null)
            {
                var isProv = proposal.Provider?.UserId == userId;
                if (!isProv && _providerRepository != null)
                {
                    var prov = await _providerRepository.GetByIdAsync(proposal.ProviderId);
                    isProv = prov?.UserId == userId;
                }

                var isCust = proposal.Service?.Customer?.UserId == userId;
                if (!isCust && proposal.Service != null && _customerRepository != null)
                {
                    var cust = await _customerRepository.GetByIdAsync(proposal.Service.CustomerId);
                    isCust = cust?.UserId == userId;
                }

                return (isCust, isProv);
            }
        }

        if (serviceId.HasValue && serviceId.Value != Guid.Empty)
        {
            var service = await _serviceRepository.GetByIdWithDetailsAsync(serviceId.Value) 
                ?? await _serviceRepository.GetByIdAsync(serviceId.Value);

            if (service != null)
            {
                var isCust = service.Customer?.UserId == userId;
                if (!isCust && _customerRepository != null)
                {
                    var cust = await _customerRepository.GetByIdAsync(service.CustomerId);
                    isCust = cust?.UserId == userId;
                }

                var hasAppt = service.Appointment?.Provider?.UserId == userId;
                var hasProp = service.Proposals.Any(p => p.Provider?.UserId == userId || p.ProviderId == userId);

                return (isCust, hasAppt || hasProp);
            }
        }

        return (false, false);
    }

    private async Task<Guid?> ResolveRecipientUserIdAsync(Guid? proposalId, Guid? serviceId, bool isFromProvider)
    {
        if (isFromProvider)
        {
            // Prestador enviou -> destinatário é o Cliente
            if (serviceId.HasValue)
            {
                var service = await _serviceRepository.GetByIdWithDetailsAsync(serviceId.Value) ?? await _serviceRepository.GetByIdAsync(serviceId.Value);
                if (service?.Customer?.UserId != null && service.Customer.UserId != Guid.Empty)
                    return service.Customer.UserId;

                if (service != null && _customerRepository != null)
                {
                    var cust = await _customerRepository.GetByIdAsync(service.CustomerId);
                    if (cust != null) return cust.UserId;
                }
            }

            if (proposalId.HasValue)
            {
                var proposal = await _proposalRepository.GetByIdWithServiceAndProviderAsync(proposalId.Value) ?? await _proposalRepository.GetByIdAsync(proposalId.Value);
                if (proposal?.Service?.Customer?.UserId != null && proposal.Service.Customer.UserId != Guid.Empty)
                    return proposal.Service.Customer.UserId;
            }
        }
        else
        {
            // Cliente enviou -> destinatário é o Prestador
            if (proposalId.HasValue)
            {
                var proposal = await _proposalRepository.GetByIdWithServiceAndProviderAsync(proposalId.Value) ?? await _proposalRepository.GetByIdAsync(proposalId.Value);
                if (proposal?.Provider?.UserId != null && proposal.Provider.UserId != Guid.Empty)
                    return proposal.Provider.UserId;

                if (proposal != null && _providerRepository != null)
                {
                    var prov = await _providerRepository.GetByIdAsync(proposal.ProviderId);
                    if (prov != null) return prov.UserId;
                }
            }

            if (serviceId.HasValue)
            {
                if (_appointmentRepository != null)
                {
                    var appt = await _appointmentRepository.GetByServiceIdAsync(serviceId.Value);
                    if (appt != null && _providerRepository != null)
                    {
                        var prov = await _providerRepository.GetByIdAsync(appt.ProviderId);
                        if (prov != null) return prov.UserId;
                    }
                }
            }
        }

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
}
