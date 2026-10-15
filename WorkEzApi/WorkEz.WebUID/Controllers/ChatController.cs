using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.Domain.Enums;
using WorkEz.Infra.Data.Context;
using WorkEz.WebUID.WebSockets;

namespace WorkEz.WebUID.Controllers;

/// <summary>
/// Dedicated Chat Controller following Clean Architecture and Single Responsibility Principle (SRP).
/// Handles all chat and real-time messaging concerns independently from Proposal lifecycles.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ChatController(
    IChatApplicationService chatService,
    AppDbContext db,
    IChatNotificationService? chatNotification = null,
    IPushNotificationService? pushNotification = null
) : ControllerBase
{
    private readonly IChatApplicationService _chatService = chatService;
    private readonly AppDbContext _db = db;
    private readonly IChatNotificationService? _chatNotification = chatNotification;
    private readonly IPushNotificationService? _pushNotification = pushNotification;

    /// <summary>
    /// Envia uma mensagem no chat (vinculada a uma proposta e/ou serviço).
    /// </summary>
    [HttpPost("messages")]
    [ProducesResponseType(typeof(ChatMessageResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SendMessage([FromBody] SendChatMessageCommand command)
    {
        var result = await _chatService.SendMessageAsync(command);
        if (result.IsSuccess && result.Value != null)
        {
            var msg = result.Value;
            var isWsActive = _chatNotification?.HasActiveSubscribers(msg.ProposalId, msg.ServiceId) ?? false;

            if (_chatNotification != null && (msg.ProposalId.HasValue || msg.ServiceId.HasValue))
            {
                var targetProposalId = msg.ProposalId ?? Guid.Empty;
                await _chatNotification.NotifyChatUpdateAsync(targetProposalId, msg.ServiceId, "new_message", msg);
            }

            // Dispara notificação push para o destinatário da mensagem
            if (_pushNotification != null)
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        Guid? recipientUserId = null;

                        if (command.IsFromProvider)
                        {
                            // Prestador enviou mensagem: destinatário é o Cliente
                            if (msg.ServiceId.HasValue && msg.ServiceId.Value != Guid.Empty)
                            {
                                var service = await _db.Services
                                    .Include(s => s.Customer)
                                    .FirstOrDefaultAsync(s => s.Id == msg.ServiceId.Value);

                                if (service?.Customer != null && service.Customer.UserId != Guid.Empty)
                                {
                                    recipientUserId = service.Customer.UserId;
                                }
                                else if (service != null)
                                {
                                    var customer = await _db.Customers.FindAsync(service.CustomerId);
                                    recipientUserId = customer?.UserId;
                                }
                            }

                            if (!recipientUserId.HasValue && msg.ProposalId.HasValue && msg.ProposalId.Value != Guid.Empty)
                            {
                                var proposal = await _db.Proposals
                                    .Include(p => p.Service)
                                        .ThenInclude(s => s.Customer)
                                    .FirstOrDefaultAsync(p => p.Id == msg.ProposalId.Value);

                                recipientUserId = proposal?.Service?.Customer?.UserId;
                            }
                        }
                        else
                        {
                            // Cliente enviou mensagem: destinatário é o Prestador
                            if (msg.ProposalId.HasValue && msg.ProposalId.Value != Guid.Empty)
                            {
                                var proposal = await _db.Proposals
                                    .Include(p => p.Provider)
                                    .FirstOrDefaultAsync(p => p.Id == msg.ProposalId.Value);

                                if (proposal?.Provider != null && proposal.Provider.UserId != Guid.Empty)
                                {
                                    recipientUserId = proposal.Provider.UserId;
                                }
                                else if (proposal != null)
                                {
                                    var prov = await _db.Providers.FindAsync(proposal.ProviderId);
                                    recipientUserId = prov?.UserId;
                                }
                            }

                            if (!recipientUserId.HasValue && msg.ServiceId.HasValue && msg.ServiceId.Value != Guid.Empty)
                            {
                                var appointment = await _db.Appointments
                                    .Include(a => a.Provider)
                                    .FirstOrDefaultAsync(a => a.ServiceId == msg.ServiceId.Value);

                                if (appointment?.Provider != null && appointment.Provider.UserId != Guid.Empty)
                                {
                                    recipientUserId = appointment.Provider.UserId;
                                }
                                else
                                {
                                    var acceptedProposal = await _db.Proposals
                                        .Include(p => p.Provider)
                                        .FirstOrDefaultAsync(p => p.ServiceId == msg.ServiceId.Value &&
                                            (p.ProposalStatus == ProposalStatus.Accepted || p.ProposalStatus == ProposalStatus.NegotiationOpen));

                                    recipientUserId = acceptedProposal?.Provider?.UserId;
                                }
                            }
                        }

                        if (recipientUserId.HasValue && recipientUserId.Value != Guid.Empty && recipientUserId.Value != command.SenderId)
                        {
                            var senderUser = await _db.Users.FindAsync(command.SenderId);
                            var senderName = senderUser?.Name ?? (command.IsFromProvider ? "Prestador" : "Cliente");
                            var preview = command.Content.Length > 80 ? command.Content[..77] + "..." : command.Content;

                            await _pushNotification.SendToUserAsync(
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
                    }
                    catch
                    {
                        // Falhas de push em background não devem impactar a resposta do chat
                    }
                });
            }

            return Ok(result.Value);
        }

        return BadRequest(new { message = result.Error, code = result.ErrorCode });
    }


    /// <summary>
    /// Retorna as mensagens de chat associadas a uma proposta.
    /// </summary>
    [HttpGet("proposals/{proposalId}")]
    [ProducesResponseType(typeof(IEnumerable<ChatMessageResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMessagesByProposal(Guid proposalId)
    {
        var messages = await _chatService.GetMessagesByProposalIdAsync(proposalId);
        return Ok(messages);
    }

    /// <summary>
    /// Retorna as mensagens de chat associadas diretamente a um serviço.
    /// </summary>
    [HttpGet("services/{serviceId}")]
    [ProducesResponseType(typeof(IEnumerable<ChatMessageResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMessagesByService(Guid serviceId)
    {
        var messages = await _chatService.GetMessagesByServiceIdAsync(serviceId);
        return Ok(messages);
    }

    /// <summary>
    /// Busca a proposta de chat ativa para um serviço (aceita ou em negociação).
    /// </summary>
    [HttpGet("active-proposal/{serviceId}")]
    [ProducesResponseType(typeof(ProposalResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetActiveProposalForService(Guid serviceId)
    {
        var proposal = await _chatService.GetActiveChatProposalByServiceIdAsync(serviceId);
        return proposal is not null ? Ok(proposal) : NotFound(new { message = "Nenhum chat ativo encontrado para este serviço." });
    }
}
