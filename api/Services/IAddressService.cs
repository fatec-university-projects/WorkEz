using WorkEz.Api.Entities;
namespace WorkEz.Api.Services;

public interface IAddressService
{
    Task<IEnumerable<Address>> GetAllAsync();
    Task<Address?> GetByIdAsync(Guid id);
    Task CreateAsync(Address address);
    Task UpdateAsync(Address address);
    Task DeleteAsync(Guid id);
}
