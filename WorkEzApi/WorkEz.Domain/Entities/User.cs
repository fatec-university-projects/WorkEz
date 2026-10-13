using WorkEz.Domain.Common;
using WorkEz.Domain.Enums;

namespace WorkEz.Domain.Entities;

public class User : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? DocumentNumber { get; set; }
    public string? ProfilePicture { get; set; }
    public UserRole Role { get; set; } = UserRole.Customer;

    public Customer? Customer { get; set; }
    public ServiceProvider? ServiceProvider { get; set; }
}
