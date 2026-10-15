using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.Infra.Data.Context;
using WorkEz.WebUID.Auth;
using WorkEz.WebUID.WebSockets;

namespace WorkEz.WebUID.Controllers;

/// <summary>
/// ProposalsController em Clean Architecture.
/// Contém chamadas delegadas para a camada de Application (<see cref="IProposalApplicationService"/>)
/// com validações rigorosas de autenticação e autorização (ResourceAccess).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ProposalsController(
    IProposalApplicationService proposalApplicationService,
    WorkEz.Domain.Interfaces.IServiceRepository serviceRepository,
    AppDbContext db,
    ITrackingNotificationService? trackingNotification = null,
    IChatNotificationService? chatNotification = null,
    IPushNotificationService? pushNotification = null
) : ControllerBase
{
    private readonly IProposalApplicationService _proposalApplicationService = proposalApplicationService;
    private readonly WorkEz.Domain.Interfaces.IServiceRepository _serviceRepository = serviceRepository;
    private readonly AppDbContext _db = db;
    private readonly ITrackingNotificationService? _trackingNotification = trackingNotification;
    private readonly IChatNotificationService? _chatNotification = chatNotification;
    private readonly IPushNotificationService? _pushNotification = pushNotification;

    /// <summary>
    /// Envia proposta de preço do prestador.
    /// </summary>
    [HttpPost("propose")]
    [ProducesResponseType(typeof(ProposalResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ProposePrice([FromBody] ProposePriceRequest request)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var isProvider = await _db.Providers.AnyAsync(p => p.UserId == me.Value);
        if (!User.IsAdmin() && !isProvider) return Forbid();

        // Garante que o prestador enviando a proposta é o usuário autenticado
        request = request with { ProviderUserId = me.Value };

        var result = await _proposalApplicationService.ProposePriceAsync(request);
        if (result.IsSuccess)
        {
            if (_trackingNotification != null)
            {
                await _trackingNotification.NotifyServiceUpdateAsync(request.ServiceId, "proposal_created", result.Value);
            }

            if (_pushNotification != null && result.Value != null)
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        var service = await _serviceRepository.GetByIdWithDetailsAsync(request.ServiceId);
                        if (service?.Customer?.UserId != null)
                        {
                            var priceFormatted = result.Value.ProposedPrice.ToString("C", new System.Globalization.CultureInfo("pt-BR"));
                            var provName = string.IsNullOrWhiteSpace(result.Value.ProviderName) ? "Um profissional" : result.Value.ProviderName;
                            await _pushNotification.SendToUserAsync(
                                service.Customer.UserId,
                                "💰 Nova proposta recebida!",
                                $"{provName} enviou uma proposta de {priceFormatted} para seu chamado.",
                                new
                                {
                                    type = "new_proposal",
                                    serviceId = service.Id,
                                    proposalId = result.Value.Id
                                }
                            );
                        }
                    }
                    catch
                    {
                        // Falhas de push em background não devem impactar a resposta
                    }
                });
            }

            return Ok(result.Value);
        }

        return BadRequest(new { message = result.Error, code = result.ErrorCode });
    }

    /// <summary>
    /// Aceite de proposta pelo cliente.
    /// </summary>
    [HttpPost("accept")]
    [ProducesResponseType(typeof(ProposalResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AcceptProposal([FromBody] AcceptProposalRequest request)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        if (!User.IsAdmin() && !await _db.IsProposalCustomerAsync(request.ProposalId, me.Value))
            return Forbid();

        request = request with { CustomerUserId = me.Value };

        var result = await _proposalApplicationService.AcceptProposalAsync(request);
        if (result.IsSuccess && result.Value != null)
        {
            if (_trackingNotification != null)
            {
                await _trackingNotification.NotifyServiceUpdateAsync(result.Value.ServiceId, "proposal_accepted", result.Value);
            }
            if (_chatNotification != null)
            {
                await _chatNotification.NotifyChatUpdateAsync(result.Value.Id, result.Value.ServiceId, "proposal_updated", result.Value);
            }
        }
        return result.IsSuccess 
            ? Ok(result.Value) 
            : BadRequest(new { message = result.Error, code = result.ErrorCode });
    }

    /// <summary>
    /// Recusa de proposta pelo cliente.
    /// </summary>
    [HttpPost("reject")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RejectProposal([FromBody] RejectProposalRequest request)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        if (!User.IsAdmin() && !await _db.IsProposalCustomerAsync(request.ProposalId, me.Value))
            return Forbid();

        request = request with { CustomerUserId = me.Value };

        var result = await _proposalApplicationService.RejectProposalAsync(request);
        if (result.IsSuccess)
        {
            var prop = await _proposalApplicationService.GetProposalByIdAsync(request.ProposalId);
            if (prop != null)
            {
                if (_trackingNotification != null)
                {
                    await _trackingNotification.NotifyServiceUpdateAsync(prop.ServiceId, "proposal_rejected", prop);
                }
                if (_chatNotification != null)
                {
                    await _chatNotification.NotifyChatUpdateAsync(prop.Id, prop.ServiceId, "proposal_updated", prop);
                }
            }
        }
        return result.IsSuccess 
            ? Ok(new { message = "Proposta recusada com sucesso." }) 
            : BadRequest(new { message = result.Error, code = result.ErrorCode });
    }

    /// <summary>
    /// Consulta uma proposta por ID.
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ProposalResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        if (!User.IsAdmin() && !await _db.IsProposalParticipantAsync(id, me.Value))
            return Forbid();

        var proposal = await _proposalApplicationService.GetProposalByIdAsync(id);
        return proposal is not null ? Ok(proposal) : NotFound(new { message = "Proposta não encontrada." });
    }

    /// <summary>
    /// Consulta propostas por ID do serviço (apenas visível para o cliente ou para o próprio prestador).
    /// </summary>
    [HttpGet("by-service/{serviceId}")]
    [ProducesResponseType(typeof(IEnumerable<ProposalResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProposalsByService(Guid serviceId)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var isCustomer = await _db.IsServiceCustomerAsync(serviceId, me.Value);
        var isProvider = await _db.IsServiceProviderAsync(serviceId, me.Value);

        if (!User.IsAdmin() && !isCustomer && !isProvider)
            return Forbid();

        var list = await _proposalApplicationService.GetProposalsByServiceIdAsync(serviceId);
        if (!User.IsAdmin() && !isCustomer)
        {
            // Prestador vê apenas as suas próprias propostas
            list = list.Where(p => p.ProviderUserId == me.Value);
        }
        return Ok(list);
    }

    /// <summary>
    /// Consulta propostas enviadas por um prestador específico.
    /// </summary>
    [HttpGet("by-provider-user/{providerUserId}")]
    [ProducesResponseType(typeof(IEnumerable<ProposalResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProposalsByProviderUser(Guid providerUserId)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        if (me.Value != providerUserId && !User.IsAdmin())
            return Forbid();

        var list = await _proposalApplicationService.GetProposalsByProviderUserIdAsync(providerUserId);
        return Ok(list);
    }

    // ── Negociação ────────────────────────────────────────────────────────────

    /// <summary>Cliente faz contra-proposta ao prestador.</summary>
    [HttpPost("counter")]
    [ProducesResponseType(typeof(ProposalResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CounterProposal([FromBody] CounterProposalRequest request)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        if (!User.IsAdmin() && !await _db.IsProposalCustomerAsync(request.ProposalId, me.Value))
            return Forbid();

        request = request with { CustomerUserId = me.Value };

        var result = await _proposalApplicationService.CounterProposalAsync(request);
        if (result.IsSuccess && result.Value != null)
        {
            if (_trackingNotification != null)
            {
                await _trackingNotification.NotifyServiceUpdateAsync(result.Value.ServiceId, "proposal_countered", result.Value);
            }
            if (_chatNotification != null)
            {
                await _chatNotification.NotifyChatUpdateAsync(result.Value.Id, result.Value.ServiceId, "proposal_updated", result.Value);
            }
        }
        return result.IsSuccess
            ? Ok(result.Value)
            : BadRequest(new { message = result.Error, code = result.ErrorCode });
    }

    /// <summary>Prestador aceita a contra-proposta do cliente.</summary>
    [HttpPost("{proposalId}/accept-counter")]
    [ProducesResponseType(typeof(ProposalResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AcceptCounter(Guid proposalId, [FromBody] ProviderActionRequest request)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        if (!User.IsAdmin() && !await _db.IsProposalProviderAsync(proposalId, me.Value))
            return Forbid();

        var result = await _proposalApplicationService.AcceptCounterAsync(new AcceptCounterRequest(me.Value, proposalId));
        if (result.IsSuccess && result.Value != null)
        {
            if (_trackingNotification != null)
            {
                await _trackingNotification.NotifyServiceUpdateAsync(result.Value.ServiceId, "counter_accepted", result.Value);
            }
            if (_chatNotification != null)
            {
                await _chatNotification.NotifyChatUpdateAsync(result.Value.Id, result.Value.ServiceId, "proposal_updated", result.Value);
            }
        }
        return result.IsSuccess
            ? Ok(result.Value)
            : BadRequest(new { message = result.Error, code = result.ErrorCode });
    }

    /// <summary>Prestador recusa a contra-proposta do cliente.</summary>
    [HttpPost("{proposalId}/reject-counter")]
    [ProducesResponseType(typeof(ProposalResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RejectCounter(Guid proposalId, [FromBody] ProviderActionRequest request)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        if (!User.IsAdmin() && !await _db.IsProposalProviderAsync(proposalId, me.Value))
            return Forbid();

        var result = await _proposalApplicationService.RejectCounterAsync(new RejectCounterRequest(me.Value, proposalId));
        if (result.IsSuccess && result.Value != null)
        {
            if (_trackingNotification != null)
            {
                await _trackingNotification.NotifyServiceUpdateAsync(result.Value.ServiceId, "counter_rejected", result.Value);
            }
            if (_chatNotification != null)
            {
                await _chatNotification.NotifyChatUpdateAsync(result.Value.Id, result.Value.ServiceId, "proposal_updated", result.Value);
            }
        }
        return result.IsSuccess
            ? Ok(result.Value)
            : BadRequest(new { message = result.Error, code = result.ErrorCode });
    }

    // ── Chat / Barganha ───────────────────────────────────────────────────────

    /// <summary>Envia mensagem no chat de negociação da proposta.</summary>
    [HttpPost("{proposalId}/chat")]
    [ProducesResponseType(typeof(ChatMessageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SendMessage(Guid proposalId, [FromBody] SendChatMessageRequest request)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var isCustomer = await _db.IsProposalCustomerAsync(proposalId, me.Value);
        var isProvider = await _db.IsProposalProviderAsync(proposalId, me.Value);

        if (!User.IsAdmin() && !isCustomer && !isProvider)
            return Forbid();

        request = request with 
        { 
            ProposalId = proposalId, 
            SenderId = me.Value, 
            IsFromProvider = isProvider && !isCustomer 
        };

        var result = await _proposalApplicationService.SendChatMessageAsync(request);
        if (result.IsSuccess && result.Value != null && _chatNotification != null)
        {
            await _chatNotification.NotifyChatUpdateAsync(proposalId, result.Value.ServiceId, "new_message", result.Value);
        }
        return result.IsSuccess
            ? Ok(result.Value)
            : BadRequest(new { message = result.Error, code = result.ErrorCode });
    }

    /// <summary>Busca o histórico de mensagens do chat de uma proposta.</summary>
    [HttpGet("{proposalId}/chat")]
    [ProducesResponseType(typeof(IEnumerable<ChatMessageDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetChat(Guid proposalId)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        if (!User.IsAdmin() && !await _db.IsProposalParticipantAsync(proposalId, me.Value))
            return Forbid();

        var messages = await _proposalApplicationService.GetChatMessagesAsync(proposalId);
        return Ok(messages);
    }

    /// <summary>
    /// Busca a proposta de chat ativa para um serviço (aceita ou em negociação).
    /// Permite que o chat persista até a conclusão do trabalho ou que um novo chat seja criado caso não tenha havido barganha.
    /// </summary>
    [HttpGet("chat-by-service/{serviceId}")]
    [ProducesResponseType(typeof(ProposalResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetChatProposalByService(Guid serviceId)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        if (!User.IsAdmin() && !await _db.IsServiceParticipantAsync(serviceId, me.Value))
            return Forbid();

        var proposal = await _proposalApplicationService.GetActiveChatProposalByServiceIdAsync(serviceId);
        return proposal is not null ? Ok(proposal) : NotFound(new { message = "Nenhum chat ativo encontrado para este serviço." });
    }
}
