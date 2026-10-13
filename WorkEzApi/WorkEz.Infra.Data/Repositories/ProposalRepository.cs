using Microsoft.EntityFrameworkCore;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Interfaces;
using WorkEz.Infra.Data.Context;

namespace WorkEz.Infra.Data.Repositories;

public class ProposalRepository(AppDbContext context) : BaseRepository<Proposal>(context), IProposalRepository
{
    public async Task<Proposal?> GetByIdWithServiceAndProviderAsync(Guid id) => await DbSet.Include(p => p.Service).ThenInclude(s => s.Customer).Include(p => p.Provider).ThenInclude(pr => pr.User).FirstOrDefaultAsync(p => p.Id == id);
    public async Task<IEnumerable<Proposal>> GetProposalsByServiceIdAsync(Guid serviceId) => await DbSet.Include(p => p.Provider).ThenInclude(pr => pr.User).Where(p => p.ServiceId == serviceId).OrderByDescending(p => p.CreatedAt).AsNoTracking().ToListAsync();
    public async Task<IEnumerable<Proposal>> GetPendingProposalsByServiceIdAsync(Guid serviceId) => await DbSet.Where(p => p.ServiceId == serviceId && p.ProposalStatus == ProposalStatus.Pending).ToListAsync();
    public async Task<Proposal?> GetExistingProposalAsync(Guid serviceId, Guid providerId) => await DbSet.FirstOrDefaultAsync(p => p.ServiceId == serviceId && p.ProviderId == providerId && p.ProposalStatus == ProposalStatus.Pending);
}
