using WorkEz.Domain.Entities;

namespace WorkEz.Domain.Interfaces;

public interface IServiceRepository : IBaseRepository<Service>
{
    Task<Service?> GetByIdWithDetailsAsync(Guid id);
    Task<IEnumerable<Service>> GetServicesByCustomerAsync(Guid customerId);
}
