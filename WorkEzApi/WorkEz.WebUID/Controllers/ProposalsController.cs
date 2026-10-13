using Microsoft.AspNetCore.Mvc;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;

namespace WorkEz.WebUID.Controllers;

/// <summary>
/// ProposalsController em Clean Architecture.
/// Contém APENAS chamadas delegadas para a camada de Application (<see cref="IProposalApplicationService"/>).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ProposalsController(IProposalApplicationService proposalApplicationService) : ControllerBase
{
    private readonly IProposalApplicationService _proposalApplicationService = proposalApplicationService;

    /// <summary>
    /// Envia proposta de preço do prestador.
    /// </summary>
    [HttpPost("propose")]
    [ProducesResponseType(typeof(ProposalResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ProposePrice([FromBody] ProposePriceRequest request)
    {
        var result = await _proposalApplicationService.ProposePriceAsync(request);
        if (result.IsFailure)
        {
            return BadRequest(new { error = result.Error, message = result.Error, code = result.ErrorCode });
        }

        return CreatedAtAction(nameof(GetByServiceId), new { serviceId = result.Value.ServiceId }, result.Value);
    }

    /// <summary>
    /// Aceite de proposta pelo cliente.
    /// </summary>
    [HttpPost("accept")]
    [ProducesResponseType(typeof(ProposalResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AcceptProposal([FromBody] AcceptProposalRequest request)
    {
        var result = await _proposalApplicationService.AcceptProposalAsync(request);
        if (result.IsFailure)
        {
            return BadRequest(new { error = result.Error, message = result.Error, code = result.ErrorCode });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Recusa de proposta pelo cliente.
    /// </summary>
    [HttpPost("reject")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RejectProposal([FromBody] RejectProposalRequest request)
    {
        var result = await _proposalApplicationService.RejectProposalAsync(request);
        if (result.IsFailure)
        {
            return BadRequest(new { error = result.Error, message = result.Error, code = result.ErrorCode });
        }

        return Ok(new { message = "Proposta recusada com sucesso." });
    }

    /// <summary>
    /// Consulta propostas por ID do serviço.
    /// </summary>
    [HttpGet("service/{serviceId:guid}")]
    [HttpGet("by-service/{serviceId:guid}")]
    [ProducesResponseType(typeof(IEnumerable<ProposalResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByServiceId(Guid serviceId)
    {
        var proposals = await _proposalApplicationService.GetProposalsByServiceIdAsync(serviceId);
        return Ok(proposals);
    }
}
