using WorkEz.Api.Entities;

namespace WorkEz.Api.Services;

public interface IProposalService
{
    Task<IEnumerable<Proposal>> GetAllAsync();
    Task<Proposal?> GetByIdAsync(Guid id);
    Task CreateAsync(Proposal proposal);
    Task UpdateAsync(Proposal proposal);
    Task DeleteAsync(Guid id);
}
