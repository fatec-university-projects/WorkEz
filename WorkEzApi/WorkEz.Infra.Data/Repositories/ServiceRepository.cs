using Microsoft.EntityFrameworkCore;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Interfaces;
using WorkEz.Infra.Data.Context;

namespace WorkEz.Infra.Data.Repositories;

public class ServiceRepository(AppDbContext context) : BaseRepository<Service>(context), IServiceRepository
{
    public async Task<Service?> GetByIdWithDetailsAsync(Guid id) => await DbSet.Include(s => s.Customer).ThenInclude(c => c.User).Include(s => s.Proposals).ThenInclude(p => p.Provider).ThenInclude(pr => pr.User).Include(s => s.Appointment).FirstOrDefaultAsync(s => s.Id == id);
    public async Task<IEnumerable<Service>> GetServicesByCustomerAsync(Guid customerId) => await DbSet.Include(s => s.Proposals).Include(s => s.Appointment).Where(s => s.CustomerId == customerId).OrderByDescending(s => s.CreatedAt).AsNoTracking().ToListAsync();
}
