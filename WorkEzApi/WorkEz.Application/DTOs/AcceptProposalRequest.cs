using System.ComponentModel.DataAnnotations;

namespace WorkEz.Application.DTOs;

/// <summary>
/// DTO Request para aceite de proposta pelo cliente.
/// </summary>
public record AcceptProposalRequest(
    [Required] Guid CustomerUserId,
    [Required] Guid ProposalId
);
