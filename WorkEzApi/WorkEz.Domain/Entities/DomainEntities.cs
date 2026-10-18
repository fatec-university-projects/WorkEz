using WorkEz.Domain.Common;
using WorkEz.Domain.Enums;

namespace WorkEz.Domain.Entities;

public class User : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? DocumentNumber { get; set; }
    public string? ProfilePicture { get; set; }
    public UserRole Role { get; set; } = UserRole.Customer;

    public Customer? Customer { get; set; }
    public ServiceProvider? ServiceProvider { get; set; }
}

public class Category : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class ProviderCategory : BaseEntity
{
    public Guid ProviderId { get; set; }
    public Guid CategoryId { get; set; }
    public string Status { get; set; } = "Active";

    public Category Category { get; set; } = null!;
}

public class Address : BaseEntity
{
    public Guid UserId { get; set; }
    public string Street { get; set; } = string.Empty;
    public string Number { get; set; } = string.Empty;
    public string? Complement { get; set; }
    public string Neighborhood { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string ZipCode { get; set; } = string.Empty;
    public string AddressType { get; set; } = "Home";
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
}

public class RefreshToken : BaseEntity
{
    public Guid UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool IsRevoked { get; set; } = false;

    public User User { get; set; } = null!;

    public bool IsActive => !IsRevoked && ExpiresAt > DateTime.UtcNow;
}

public class Customer : BaseEntity
{
    public Guid UserId { get; set; }
    public string? Notes { get; set; }

    public User User { get; set; } = null!;
    public ICollection<Service> Services { get; set; } = [];
    public ICollection<Appointment> Appointments { get; set; } = [];
}

public class ServiceProvider : BaseEntity
{
    public Guid UserId { get; set; }
    public string? ProfessionalDescription { get; set; }
    public decimal AverageRating { get; set; } = 0.0m;
    public bool DocumentVerified { get; set; } = false;
    public int CompletedServicesCount { get; set; } = 0;
    public string AvailabilityStatus { get; set; } = "Available";
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public double ServiceRadiusKm { get; set; } = 15.0;

    public User User { get; set; } = null!;
    public ICollection<Proposal> Proposals { get; set; } = [];
    public ICollection<Appointment> Appointments { get; set; } = [];
    public List<string> Portfolio { get; set; } = [];
    public List<Guid> CategoryIds { get; set; } = [];
}

public class ChatMessage : BaseEntity
{
    public Guid? ProposalId { get; set; }
    public Guid? ServiceId { get; set; }
    public Guid SenderId { get; set; }
    public string Content { get; set; } = string.Empty;
    public bool IsFromProvider { get; set; }
    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    public Proposal? Proposal { get; set; }
    public Service? Service { get; set; }
}

public class Service : BaseEntity
{
    public Guid CustomerId { get; set; }
    public Guid CategoryId { get; set; }
    public Guid? AddressId { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime? DesiredDate { get; set; }
    public ServiceStatus ServiceStatus { get; set; } = ServiceStatus.Open;

    // ── Segurança Operacional & Vistorias (Branch 5) ──────────────────────────
    public string? StartCheckInCode { get; set; }
    public string? BeforePhotosJson { get; set; }
    public string? AfterPhotosJson { get; set; }
    public string? CompletedClientSignatureUrl { get; set; }

    public Customer Customer { get; set; } = null!;
    public Address? Address { get; set; }
    public ICollection<Proposal> Proposals { get; set; } = [];
    public Appointment? Appointment { get; set; }

    public string GenerateStartCheckInCode()
    {
        StartCheckInCode = new Random().Next(1000, 10000).ToString("D4");
        return StartCheckInCode;
    }
}

public class Proposal : BaseEntity
{
    public Guid ServiceId { get; set; }
    public Guid ProviderId { get; set; }
    public decimal ProposedPrice { get; set; }
    public decimal? LaborPrice { get; set; }
    public decimal? MaterialsPrice { get; set; }
    public string? Description { get; set; }
    public string? EstimatedTime { get; set; }
    public ProposalStatus ProposalStatus { get; set; } = ProposalStatus.Pending;

    // ── Contra-proposta (feita pelo cliente) ──────────────────────────────────
    public decimal? CounterPrice { get; set; }
    public string? CounterDescription { get; set; }
    public DateTime? CounterOfferedAt { get; set; }

    public Service Service { get; set; } = null!;
    public ServiceProvider Provider { get; set; } = null!;
    public Appointment? Appointment { get; set; }
    public ICollection<ChatMessage> ChatMessages { get; set; } = [];
}

public class Appointment : BaseEntity
{
    public Guid ServiceId { get; set; }
    public Guid ProposalId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid ProviderId { get; set; }
    public AppointmentStatus AppointmentStatus { get; set; } = AppointmentStatus.Confirmed;
    public decimal FinalPrice { get; set; }
    public DateTime ScheduledDate { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? ConfirmationCode { get; set; }

    public Service Service { get; set; } = null!;
    public Proposal Proposal { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
    public ServiceProvider Provider { get; set; } = null!;
}

public class Review : BaseEntity
{
    public Guid? AppointmentId { get; set; }
    public Guid? ServiceId { get; set; }
    public Guid ReviewerUserId { get; set; }
    public Guid ReviewedUserId { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }

    public Appointment? Appointment { get; set; }
    public Service? Service { get; set; }
    public User ReviewerUser { get; set; } = null!;
    public User ReviewedUser { get; set; } = null!;
}

public class UserDeviceToken : BaseEntity
{
    public Guid UserId { get; set; }
    public string ExpoPushToken { get; set; } = string.Empty;
    public string? Platform { get; set; }

    public User? User { get; set; }
}

public class WalletTransaction : BaseEntity
{
    public Guid ProviderId { get; set; }
    public Guid? ServiceId { get; set; }
    public Guid? AppointmentId { get; set; }
    public decimal Amount { get; set; }
    public decimal GrossAmount { get; set; }
    public decimal LaborAmount { get; set; }
    public decimal MaterialsAmount { get; set; }
    public decimal PlatformFeeAmount { get; set; }
    public WalletTransactionType TransactionType { get; set; } = WalletTransactionType.Credit;
    public WalletTransactionStatus Status { get; set; } = WalletTransactionStatus.Completed;
    public string? Description { get; set; }

    public ServiceProvider Provider { get; set; } = null!;
    public Service? Service { get; set; }
    public Appointment? Appointment { get; set; }
}

public class WithdrawalRequest : BaseEntity
{
    public Guid ProviderId { get; set; }
    public decimal Amount { get; set; }
    public string PixKey { get; set; } = string.Empty;
    public PixKeyType PixKeyType { get; set; } = PixKeyType.CPF;
    public WithdrawalStatus Status { get; set; } = WithdrawalStatus.Pending;
    public string? ReceiptNumber { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public string? Notes { get; set; }

    public ServiceProvider Provider { get; set; } = null!;
}

