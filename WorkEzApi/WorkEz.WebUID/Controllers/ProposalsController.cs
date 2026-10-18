using Microsoft.AspNetCore.Mvc;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.Domain.Common;
using WorkEz.WebUID.Auth;

namespace WorkEz.WebUID.Controllers;

/// <summary>
/// Controller magra (Thin Controller) para Propostas e Negociação em Clean Architecture.
/// Responsável pelo transporte HTTP e delegação ao <see cref="IProposalApplicationService"/>.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ProposalsController(IProposalApplicationService proposalApplicationService) : ControllerBase
{
    private readonly IProposalApplicationService _proposalService = proposalApplicationService;

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

        var result = await _proposalService.ProposePriceAsync(request, me.Value, User.IsAdmin());
        return ToActionResult(result);
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

        var result = await _proposalService.AcceptProposalAsync(request, me.Value, User.IsAdmin());
        return ToActionResult(result);
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

        var result = await _proposalService.RejectProposalAsync(request, me.Value, User.IsAdmin());
        if (result.IsSuccess) return Ok(new { message = "Proposta recusada com sucesso." });
        return ToActionResult(result);
    }

    /// <summary>
    /// Consulta uma proposta por ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ProposalResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _proposalService.GetProposalByIdAsync(id, me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    /// <summary>
    /// Consulta propostas por ID do serviço (apenas visível para o cliente ou para o prestador autor das propostas).
    /// </summary>
    [HttpGet("by-service/{serviceId:guid}")]
    [ProducesResponseType(typeof(IEnumerable<ProposalResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProposalsByService(Guid serviceId)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _proposalService.GetProposalsByServiceIdAsync(serviceId, me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    /// <summary>
    /// Consulta propostas enviadas por um prestador específico.
    /// </summary>
    [HttpGet("by-provider-user/{providerUserId:guid}")]
    [ProducesResponseType(typeof(IEnumerable<ProposalResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProposalsByProviderUser(Guid providerUserId)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _proposalService.GetProposalsByProviderUserIdAsync(providerUserId, me.Value, User.IsAdmin());
        return ToActionResult(result);
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

        var result = await _proposalService.CounterProposalAsync(request, me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    /// <summary>Prestador aceita a contra-proposta do cliente.</summary>
    [HttpPost("{proposalId:guid}/accept-counter")]
    [ProducesResponseType(typeof(ProposalResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AcceptCounter(Guid proposalId, [FromBody] ProviderActionRequest? request = null)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _proposalService.AcceptCounterAsync(new AcceptCounterRequest(me.Value, proposalId), me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    /// <summary>Prestador recusa a contra-proposta do cliente.</summary>
    [HttpPost("{proposalId:guid}/reject-counter")]
    [ProducesResponseType(typeof(ProposalResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RejectCounter(Guid proposalId, [FromBody] ProviderActionRequest? request = null)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _proposalService.RejectCounterAsync(new RejectCounterRequest(me.Value, proposalId), me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    // ── Chat / Barganha ───────────────────────────────────────────────────────

    /// <summary>Envia mensagem no chat de negociação da proposta.</summary>
    [HttpPost("{proposalId:guid}/chat")]
    [ProducesResponseType(typeof(ChatMessageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SendMessage(Guid proposalId, [FromBody] SendChatMessageRequest request)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _proposalService.SendChatMessageAsync(request with { ProposalId = proposalId }, me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    /// <summary>Busca o histórico de mensagens do chat de uma proposta.</summary>
    [HttpGet("{proposalId:guid}/chat")]
    [ProducesResponseType(typeof(IEnumerable<ChatMessageDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetChat(Guid proposalId)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _proposalService.GetChatMessagesAsync(proposalId, me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    /// <summary>
    /// Busca a proposta de chat ativa para um serviço (aceita ou em negociação).
    /// </summary>
    [HttpGet("chat-by-service/{serviceId:guid}")]
    [ProducesResponseType(typeof(ProposalResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetChatProposalByService(Guid serviceId)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _proposalService.GetActiveChatProposalByServiceIdAsync(serviceId, me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    private IActionResult ToActionResult<T>(Result<T> result)
    {
        if (result.IsSuccess) return Ok(result.Value);

        return result.ErrorCode switch
        {
            "FORBIDDEN" or "UNAUTHORIZED_CUSTOMER" or "UNAUTHORIZED_PROVIDER" => Forbid(),
            "UNAUTHORIZED" => Unauthorized(),
            "NOT_FOUND" or "PROPOSAL_NOT_FOUND" or "SERVICE_NOT_FOUND" => NotFound(new { message = result.Error, code = result.ErrorCode }),
            _ => BadRequest(new { message = result.Error, code = result.ErrorCode })
        };
    }

    private IActionResult ToActionResult(Result result)
    {
        if (result.IsSuccess) return Ok();

        return result.ErrorCode switch
        {
            "FORBIDDEN" or "UNAUTHORIZED_CUSTOMER" or "UNAUTHORIZED_PROVIDER" => Forbid(),
            "UNAUTHORIZED" => Unauthorized(),
            "NOT_FOUND" or "PROPOSAL_NOT_FOUND" or "SERVICE_NOT_FOUND" => NotFound(new { message = result.Error, code = result.ErrorCode }),
            _ => BadRequest(new { message = result.Error, code = result.ErrorCode })
        };
    }
}
