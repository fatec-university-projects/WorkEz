using Microsoft.AspNetCore.Mvc;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.Domain.Common;
using WorkEz.WebUID.Auth;

namespace WorkEz.WebUID.Controllers;

/// <summary>
/// Controller magra (Thin Controller) para Chat e Mensagens em Clean Architecture.
/// Responsável pelo transporte HTTP e delegação ao <see cref="IChatApplicationService"/>.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ChatController(IChatApplicationService chatService) : ControllerBase
{
    private readonly IChatApplicationService _chatService = chatService;

    /// <summary>
    /// Envia uma mensagem no chat (vinculada a uma proposta e/ou serviço).
    /// </summary>
    [HttpPost("messages")]
    [ProducesResponseType(typeof(ChatMessageResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SendMessage([FromBody] SendChatMessageCommand command)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _chatService.SendMessageAsync(command, me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    /// <summary>
    /// Retorna as mensagens de chat associadas a uma proposta.
    /// </summary>
    [HttpGet("proposals/{proposalId}")]
    [ProducesResponseType(typeof(IEnumerable<ChatMessageResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMessagesByProposal(Guid proposalId)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _chatService.GetMessagesByProposalIdAsync(proposalId, me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    /// <summary>
    /// Retorna as mensagens de chat associadas diretamente a um serviço.
    /// </summary>
    [HttpGet("services/{serviceId}")]
    [ProducesResponseType(typeof(IEnumerable<ChatMessageResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMessagesByService(Guid serviceId)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _chatService.GetMessagesByServiceIdAsync(serviceId, me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    /// <summary>
    /// Busca a proposta de chat ativa para um serviço (aceita ou em negociação).
    /// </summary>
    [HttpGet("active-proposal/{serviceId}")]
    [ProducesResponseType(typeof(ProposalResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetActiveProposalForService(Guid serviceId)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _chatService.GetActiveChatProposalByServiceIdAsync(serviceId, me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    private IActionResult ToActionResult<T>(Result<T> result)
    {
        if (result.IsSuccess) return Ok(result.Value);

        return result.ErrorCode switch
        {
            "FORBIDDEN" => Forbid(),
            "UNAUTHORIZED" => Unauthorized(),
            "NOT_FOUND" or "SERVICE_NOT_FOUND" or "PROPOSAL_NOT_FOUND" => NotFound(new { message = result.Error, code = result.ErrorCode }),
            _ => BadRequest(new { message = result.Error, code = result.ErrorCode })
        };
    }
}
