using System.ComponentModel.DataAnnotations;

namespace WorkEz.Application.DTOs;

/// <summary>
/// DTO Request para recusa de proposta pelo cliente.
/// </summary>
public record RejectProposalRequest(
    [Required] Guid CustomerUserId,
    [Required] Guid ProposalId,
    string? Reason
);
