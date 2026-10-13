using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Events;
using WorkEz.Domain.Interfaces;

namespace WorkEz.Domain.Services;

public interface IUserDomainService : IBaseService<User>
{
    Task<Result<User>> RegisterUserAsync(string name, string email, UserRole role, string? phone = null, string? documentNumber = null);
    Task<User?> GetByEmailAsync(string email);
}

public class UserDomainService(
    IBaseRepository<User> userRepository,
    IBaseRepository<Customer> customerRepository,
    IBaseRepository<ServiceProvider> providerRepository,
    IBaseMessageBroker messageBroker,
    IEmailService emailService
) : BaseService<User>(userRepository), IUserDomainService
{
    private readonly IBaseRepository<User> _userRepository = userRepository;
    private readonly IBaseRepository<Customer> _customerRepository = customerRepository;
    private readonly IBaseRepository<ServiceProvider> _providerRepository = providerRepository;
    private readonly IBaseMessageBroker _messageBroker = messageBroker;
    private readonly IEmailService _emailService = emailService;

    public async Task<User?> GetByEmailAsync(string email)
    {
        var users = await _userRepository.FindAsync(u => u.Email.ToLower() == email.Trim().ToLower());
        return users.FirstOrDefault();
    }

    public async Task<Result<User>> RegisterUserAsync(string name, string email, UserRole role, string? phone = null, string? documentNumber = null)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var existing = await GetByEmailAsync(normalizedEmail);
        if (existing != null)
        {
            return Result<User>.Failure("Já existe um usuário cadastrado com este e-mail.", "EMAIL_ALREADY_EXISTS");
        }

        var user = new User
        {
            Name = name.Trim(),
            Email = normalizedEmail,
            Phone = phone?.Trim(),
            DocumentNumber = documentNumber?.Trim(),
            Role = role
        };

        await _userRepository.AddAsync(user);

        if (role == UserRole.Customer)
        {
            var customer = new Customer
            {
                UserId = user.Id
            };
            await _customerRepository.AddAsync(customer);
        }
        else if (role == UserRole.ServiceProvider)
        {
            var provider = new ServiceProvider
            {
                UserId = user.Id
            };
            await _providerRepository.AddAsync(provider);
        }

        await _userRepository.SaveChangesAsync();

        // 1. Publica Evento de Domínio
        await _messageBroker.PublishAsync(new UserRegisteredEvent(
            EventId: Guid.NewGuid(),
            OccurredOn: DateTime.UtcNow,
            UserId: user.Id,
            Name: user.Name,
            Email: user.Email,
            Role: role.ToString()
        ));

        // 2. Dispara e-mail de Boas-Vindas
        await _emailService.SendWelcomeNotificationAsync(
            userEmail: user.Email,
            userName: user.Name,
            userRole: role.ToString()
        );

        return Result<User>.Success(user);
    }
}
