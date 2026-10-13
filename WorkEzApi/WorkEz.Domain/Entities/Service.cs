using WorkEz.Domain.Common;
using WorkEz.Domain.Enums;

namespace WorkEz.Domain.Entities;

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
