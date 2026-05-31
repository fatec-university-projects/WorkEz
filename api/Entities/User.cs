using WorkEz.Api.Enums;

namespace WorkEz.Api.Entities;

/// <summary>
/// Stores common authentication and profile data shared by all user types.
/// The <see cref="UserRole"/> determines which profile table (Customer, ServiceProvider, or Administrator) holds the extended data.
/// </summary>
public class User
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    /// <summary>BCrypt hash of the user's password (kept in the related <see cref="UserPassword"/> entity).</summary>
    public string? Phone { get; set; }

    /// <summary>CPF, CNPJ, or equivalent national document number.</summary>
    public string? DocumentNumber { get; set; }

    /// <summary>URL or relative path to the user's profile picture.</summary>
    public string? ProfilePicture { get; set; }

    public AccountStatus AccountStatus { get; set; } = AccountStatus.Active;

    public UserRole Role { get; set; } = UserRole.Customer;

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // ── Navigation properties ──────────────────────────────────────────────────
    public UserPassword? Password { get; set; }
    public ICollection<UserClaim> Claims { get; set; } = [];
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
    public Customer? Customer { get; set; }
    public ServiceProvider? ServiceProvider { get; set; }
    public Administrator? Administrator { get; set; }
    public ICollection<Address> Addresses { get; set; } = [];
    public ICollection<Notification> Notifications { get; set; } = [];
}
