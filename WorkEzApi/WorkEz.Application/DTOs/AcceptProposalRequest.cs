using System.ComponentModel.DataAnnotations;

namespace WorkEz.Application.DTOs;

public record AcceptProposalRequest(
    [Required] Guid CustomerUserId,
    [Required] Guid ProposalId
);
