using WorkEz.Domain.Entities;

namespace WorkEz.Domain.Interfaces;

public interface IProposalRepository : IBaseRepository<Proposal>
{
    Task<Proposal?> GetByIdWithServiceAndProviderAsync(Guid id);
    Task<IEnumerable<Proposal>> GetProposalsByServiceIdAsync(Guid serviceId);
    Task<IEnumerable<Proposal>> GetPendingProposalsByServiceIdAsync(Guid serviceId);
    Task<Proposal?> GetExistingProposalAsync(Guid serviceId, Guid providerId);
}
