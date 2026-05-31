using WorkEz.Api.Enums;

namespace WorkEz.Api.Entities;

/// <summary>
/// Stores data specific to a service provider.
/// </summary>
public class ServiceProvider
{
    public Guid Id { get; init; } = Guid.NewGuid();

    /// <summary>Foreign key to <see cref="User"/>.</summary>
    public Guid UserId { get; set; }

    /// <summary>Short bio / description of the provider's professional background.</summary>
    public string? ProfessionalDescription { get; set; }

    /// <summary>Indicates whether the provider's identity document has been verified by an administrator.</summary>
    public bool DocumentVerified { get; set; } = false;

    /// <summary>Computed average rating (1–5) from <see cref="Review"/> records; maintained via application logic or DB trigger.</summary>
    public decimal AverageRating { get; set; } = 0m;

    /// <summary>Running count of successfully completed appointments.</summary>
    public int CompletedServicesCount { get; set; } = 0;

    public AvailabilityStatus AvailabilityStatus { get; set; } = AvailabilityStatus.Available;

    // ── Navigation properties ──────────────────────────────────────────────────
    public User User { get; set; } = null!;
    public ICollection<ProviderCategory> ProviderCategories { get; set; } = [];
    public ICollection<ServiceArea> ServiceAreas { get; set; } = [];
    public ICollection<Proposal> Proposals { get; set; } = [];
    public ICollection<Appointment> Appointments { get; set; } = [];
    public ICollection<Conversation> Conversations { get; set; } = [];
}
