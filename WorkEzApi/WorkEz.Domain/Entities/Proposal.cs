using WorkEz.Domain.Common;
using WorkEz.Domain.Enums;

namespace WorkEz.Domain.Entities;

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
