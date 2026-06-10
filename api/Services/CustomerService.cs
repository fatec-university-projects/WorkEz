using WorkEz.Api.Data;
using WorkEz.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace WorkEz.Api.Services;

public class CustomerService(AppDbContext context) : ICustomerService
{
    public async Task<IEnumerable<Customer>> GetAllAsync()
        => await context.Customers.AsNoTracking().ToListAsync();

    public async Task<Customer?> GetByIdAsync(Guid id)
        => await context.Customers.FindAsync(id);

    public async Task CreateAsync(Customer customer)
    {
        context.Customers.Add(customer);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Customer customer)
    {
        context.Customers.Update(customer);
        await context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await context.Customers.FindAsync(id);
        if (entity is null) return;
        context.Customers.Remove(entity);
        await context.SaveChangesAsync();
    }
}
