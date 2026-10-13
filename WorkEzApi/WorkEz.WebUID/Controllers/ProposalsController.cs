using Microsoft.AspNetCore.Mvc;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;

namespace WorkEz.WebUID.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProposalsController(IProposalApplicationService proposalApplicationService) : ControllerBase
{
    private readonly IProposalApplicationService _proposalApplicationService = proposalApplicationService;

    [HttpPost("propose")]
    public async Task<IActionResult> ProposePrice([FromBody] ProposePriceRequest request)
    {
        var result = await _proposalApplicationService.ProposePriceAsync(request);
        if (result.IsFailure)
        {
            return BadRequest(new { error = result.Error, code = result.ErrorCode });
        }

        return CreatedAtAction(nameof(GetByServiceId), new { serviceId = result.Value.ServiceId }, result.Value);
    }

    [HttpPost("accept")]
    public async Task<IActionResult> AcceptProposal([FromBody] AcceptProposalRequest request)
    {
        var result = await _proposalApplicationService.AcceptProposalAsync(request);
        if (result.IsFailure)
        {
            return BadRequest(new { error = result.Error, code = result.ErrorCode });
        }

        return Ok(result.Value);
    }

    [HttpPost("reject")]
    public async Task<IActionResult> RejectProposal([FromBody] RejectProposalRequest request)
    {
        var result = await _proposalApplicationService.RejectProposalAsync(request);
        if (result.IsFailure)
        {
            return BadRequest(new { error = result.Error, code = result.ErrorCode });
        }

        return NoContent();
    }

    [HttpGet("service/{serviceId:guid}")]
    public async Task<IActionResult> GetByServiceId(Guid serviceId)
    {
        var proposals = await _proposalApplicationService.GetProposalsByServiceIdAsync(serviceId);
        return Ok(proposals);
    }
}
