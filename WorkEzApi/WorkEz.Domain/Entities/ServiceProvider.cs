using WorkEz.Domain.Common;

namespace WorkEz.Domain.Entities;

public class ServiceProvider : BaseEntity
{
    public Guid UserId { get; set; }
    public string? ProfessionalDescription { get; set; }
    public decimal AverageRating { get; set; } = 5.0m;

    public User User { get; set; } = null!;
    public ICollection<Proposal> Proposals { get; set; } = [];
    public ICollection<Appointment> Appointments { get; set; } = [];
}
