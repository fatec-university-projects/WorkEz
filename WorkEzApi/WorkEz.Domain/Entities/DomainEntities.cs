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
    public decimal AverageRating { get; set; } = 5.0m;

    public User User { get; set; } = null!;
    public ICollection<Proposal> Proposals { get; set; } = [];
    public ICollection<Appointment> Appointments { get; set; } = [];
}

public class Service : BaseEntity
{
    public Guid CustomerId { get; set; }
    public Guid CategoryId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime? DesiredDate { get; set; }
    public ServiceStatus ServiceStatus { get; set; } = ServiceStatus.Open;

    public Customer Customer { get; set; } = null!;
    public ICollection<Proposal> Proposals { get; set; } = [];
    public Appointment? Appointment { get; set; }
}

public class Proposal : BaseEntity
{
    public Guid ServiceId { get; set; }
    public Guid ProviderId { get; set; }
    public decimal ProposedPrice { get; set; }
    public string? Description { get; set; }
    public string? EstimatedTime { get; set; }
    public ProposalStatus ProposalStatus { get; set; } = ProposalStatus.Pending;

    public Service Service { get; set; } = null!;
    public ServiceProvider Provider { get; set; } = null!;
    public Appointment? Appointment { get; set; }
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
