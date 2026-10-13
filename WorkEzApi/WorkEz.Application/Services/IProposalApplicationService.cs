using WorkEz.Application.DTOs;
using WorkEz.Domain.Common;

namespace WorkEz.Application.Services;

public interface IProposalApplicationService
{
    Task<Result<ProposalResponseDto>> ProposePriceAsync(ProposePriceRequest request);
    Task<Result<ProposalResponseDto>> AcceptProposalAsync(AcceptProposalRequest request);
    Task<Result> RejectProposalAsync(RejectProposalRequest request);
    Task<IEnumerable<ProposalResponseDto>> GetProposalsByServiceIdAsync(Guid serviceId);
}
