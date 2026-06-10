using WorkEz.Api.Data;
using WorkEz.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace WorkEz.Api.Services;

public class ProposalService(AppDbContext context) : IProposalService
{
    public async Task<IEnumerable<Proposal>> GetAllAsync()
        => await context.Proposals.AsNoTracking().ToListAsync();

    public async Task<Proposal?> GetByIdAsync(Guid id)
        => await context.Proposals.FindAsync(id);

    public async Task CreateAsync(Proposal proposal)
    {
        context.Proposals.Add(proposal);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Proposal proposal)
    {
        context.Proposals.Update(proposal);
        await context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await context.Proposals.FindAsync(id);
        if (entity is null) return;
        context.Proposals.Remove(entity);
        await context.SaveChangesAsync();
    }
}
