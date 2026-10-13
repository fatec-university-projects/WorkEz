using WorkEz.Domain.Common;

namespace WorkEz.Domain.Entities;

public class Customer : BaseEntity
{
    public Guid UserId { get; set; }
    public string? Notes { get; set; }

    public User User { get; set; } = null!;
    public ICollection<Service> Services { get; set; } = [];
    public ICollection<Appointment> Appointments { get; set; } = [];
}
