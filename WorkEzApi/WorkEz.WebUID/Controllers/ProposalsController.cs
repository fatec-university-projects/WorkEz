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
    [ProducesResponseType(typeof(ProposalResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ProposePrice([FromBody] ProposePriceRequest request)
    {
        var result = await _proposalApplicationService.ProposePriceAsync(request);
        return result.IsSuccess 
            ? Ok(result.Value) 
            : BadRequest(new { message = result.Error, code = result.ErrorCode });
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
        var result = await _proposalApplicationService.RejectProposalAsync(request);
        return result.IsSuccess 
            ? Ok(new { message = "Proposta recusada com sucesso." }) 
            : BadRequest(new { message = result.Error, code = result.ErrorCode });
    }

    /// <summary>
    /// Consulta propostas por ID do serviço.
    /// </summary>
    [HttpGet("by-service/{serviceId}")]
    [ProducesResponseType(typeof(IEnumerable<ProposalResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProposalsByService(Guid serviceId)
    {
        var list = await _proposalApplicationService.GetProposalsByServiceIdAsync(serviceId);
        return Ok(list);
    }
}
