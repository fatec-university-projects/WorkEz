using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;
using Microsoft.EntityFrameworkCore;
using WorkEz.Api.Entities;
using WorkEz.Api.Services;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages proposals sent by service providers in response to service requests.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ProposalsController(AppDbContext context, IProposalService proposalService) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("by-service/{serviceId}")]
    public async Task<IActionResult> GetProposalsByService(Guid serviceId)
    {
        var list = await context.Proposals.AsNoTracking().Where(p => p.ServiceId == serviceId).ToListAsync();
        return Ok(list);
    }

    [AllowAnonymous]
    [HttpGet("by-provider/{providerId}")]
    public async Task<IActionResult> GetProposalsByProvider(Guid providerId)
    {
        var list = await context.Proposals.AsNoTracking().Where(p => p.ProviderId == providerId).ToListAsync();
        return Ok(list);
    }

    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetProposalById(Guid id)
    {
        var p = await proposalService.GetByIdAsync(id);
        return p is null ? NotFound() : Ok(p);
    }

    [AllowAnonymous]
    [HttpPost("by-service/{serviceId}")]
    public async Task<IActionResult> CreateProposal(Guid serviceId, [FromBody] Proposal proposal)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        proposal.ServiceId = serviceId;
        await proposalService.CreateAsync(proposal);
        return CreatedAtAction(nameof(GetProposalById), new { id = proposal.Id }, proposal);
    }

    [AllowAnonymous]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProposal(Guid id, [FromBody] Proposal proposal)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (id != proposal.Id) return BadRequest(new { message = "Id mismatch." });
        var existing = await proposalService.GetByIdAsync(id);
        if (existing is null) return NotFound();
        await proposalService.UpdateAsync(proposal);
        return NoContent();
    }

    [AllowAnonymous]
    [HttpPatch("{id}/accept")]
    public async Task<IActionResult> UpdateProposalAccept(Guid id)
    {
        var p = await proposalService.GetByIdAsync(id);
        if (p is null) return NotFound();
        // Placeholder: accept logic
        return NoContent();
    }

    [AllowAnonymous]
    [HttpPatch("{id}/reject")]
    public async Task<IActionResult> UpdateProposalReject(Guid id)
    {
        var p = await proposalService.GetByIdAsync(id);
        if (p is null) return NotFound();
        // Placeholder: reject logic
        return NoContent();
    }

    [AllowAnonymous]
    [HttpPatch("{id}/cancel")]
    public async Task<IActionResult> UpdateProposalCancel(Guid id)
    {
        var p = await proposalService.GetByIdAsync(id);
        if (p is null) return NotFound();
        // Placeholder: cancel logic
        return NoContent();
    }

}
