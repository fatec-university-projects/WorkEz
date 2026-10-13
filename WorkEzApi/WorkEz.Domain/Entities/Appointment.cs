using WorkEz.Domain.Common;
using WorkEz.Domain.Enums;

namespace WorkEz.Domain.Entities;

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
