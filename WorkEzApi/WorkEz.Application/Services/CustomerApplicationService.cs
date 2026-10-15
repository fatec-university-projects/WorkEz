using WorkEz.Application.DTOs;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Interfaces;

namespace WorkEz.Application.Services;

public interface ICustomerApplicationService
{
    Task<Result<CustomerProfileDto>> GetByUserIdAsync(Guid userId, Guid callerUserId, bool isAdmin);
    Task<Result<CustomerProfileDto>> GetByIdAsync(Guid id, Guid? callerUserId, bool isAdmin);
}

public class CustomerApplicationService(
    ICustomerRepository customerRepository,
    IBaseRepository<User> userRepository
) : ICustomerApplicationService
{
    private readonly ICustomerRepository _customerRepository = customerRepository;
    private readonly IBaseRepository<User> _userRepository = userRepository;

    public async Task<Result<CustomerProfileDto>> GetByUserIdAsync(Guid userId, Guid callerUserId, bool isAdmin)
    {
        if (callerUserId != userId && !isAdmin)
            return Result<CustomerProfileDto>.Failure("Acesso negado.", "FORBIDDEN");

        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
            return Result<CustomerProfileDto>.Failure("Usuário não encontrado.", "NOT_FOUND");

        var customer = await _customerRepository.GetByUserIdWithUserAsync(userId);
        if (customer == null)
        {
            customer = new Customer
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                User = user
            };
            await _customerRepository.AddAsync(customer);
            await _customerRepository.SaveChangesAsync();
        }

        return Result<CustomerProfileDto>.Success(new CustomerProfileDto(
            customer.Id,
            customer.UserId,
            customer.User?.Name ?? user.Name,
            customer.User?.Email ?? user.Email,
            customer.User?.Phone ?? user.Phone,
            customer.User?.ProfilePicture ?? user.ProfilePicture,
            customer.Notes
        ));
    }

    public async Task<Result<CustomerProfileDto>> GetByIdAsync(Guid id, Guid? callerUserId, bool isAdmin)
    {
        var customer = await _customerRepository.GetByIdWithUserAsync(id);
        if (customer == null)
            return Result<CustomerProfileDto>.Failure("Cliente não encontrado.", "NOT_FOUND");

        var canSeeContact = (callerUserId.HasValue && callerUserId.Value == customer.UserId) || isAdmin;

        return Result<CustomerProfileDto>.Success(new CustomerProfileDto(
            customer.Id,
            customer.UserId,
            customer.User?.Name ?? "Cliente",
            canSeeContact ? customer.User?.Email ?? "" : "",
            canSeeContact ? customer.User?.Phone : null,
            customer.User?.ProfilePicture,
            canSeeContact ? customer.Notes : null
        ));
    }
}
