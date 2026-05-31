using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages proposals sent by service providers in response to service requests.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ProposalsController(AppDbContext context) : ControllerBase
{
    [HttpGet("by-service/{serviceId}")]
    public async Task<IActionResult> GetProposalsByService(Guid serviceId)
    {
        throw notimplementedException;
    }

    [HttpGet("by-provider/{providerId}")]
    public async Task<IActionResult> GetProposalsByProvider(Guid providerId)
    {
        throw notimplementedException;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProposalById(Guid id)
    {
        throw notimplementedException;
    }

    [HttpPost("by-service/{serviceId}")]
    public async Task<IActionResult> CreateProposal(Guid serviceId, Proposal proposal)
    {
        throw notimplementedException;
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProposal(Guid id, Proposal proposal)
    {
        throw notimplementedException;
    }

    [HttpPatch("{id}/accept")]
    public async Task<IActionResult> UpdateProposalAccept(Guid id)
    {
        throw notimplementedException;
    }

    [HttpPatch("{id}/reject")]
    public async Task<IActionResult> UpdateProposalReject(Guid id)
    {
        throw notimplementedException;
    }

    [HttpPatch("{id}/cancel")]
    public async Task<IActionResult> UpdateProposalCancel(Guid id)
    {
        throw notimplementedException;
    }

}
