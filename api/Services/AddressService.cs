using WorkEz.Api.Data;
using WorkEz.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace WorkEz.Api.Services;

public class AddressService(AppDbContext context) : IAddressService
{
    public async Task<IEnumerable<Address>> GetAllAsync()
        => await context.Addresses.AsNoTracking().ToListAsync();

    public async Task<Address?> GetByIdAsync(Guid id)
        => await context.Addresses.FindAsync(id);

    public async Task CreateAsync(Address address)
    {
        context.Addresses.Add(address);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Address address)
    {
        context.Addresses.Update(address);
        await context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await context.Addresses.FindAsync(id);
        if (entity is null) return;
        context.Addresses.Remove(entity);
        await context.SaveChangesAsync();
    }
}
