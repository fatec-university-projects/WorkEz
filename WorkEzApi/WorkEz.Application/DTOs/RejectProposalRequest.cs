using System.ComponentModel.DataAnnotations;

namespace WorkEz.Application.DTOs;

public record RejectProposalRequest(
    [Required] Guid CustomerUserId,
    [Required] Guid ProposalId,
    string? Reason
);
