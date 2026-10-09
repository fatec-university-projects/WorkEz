using Microsoft.AspNetCore.Mvc;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
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
    IChatNotificationService? chatNotification = null
) : ControllerBase
{
    private readonly IChatApplicationService _chatService = chatService;
    private readonly IChatNotificationService? _chatNotification = chatNotification;

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
            if (_chatNotification != null && (result.Value.ProposalId.HasValue || result.Value.ServiceId.HasValue))
            {
                var targetProposalId = result.Value.ProposalId ?? Guid.Empty;
                await _chatNotification.NotifyChatUpdateAsync(targetProposalId, result.Value.ServiceId, "new_message", result.Value);
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
