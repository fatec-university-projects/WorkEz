namespace WorkEz.Api.Entities;

/// <summary>
/// Stores data specific to a customer (end-user that creates service requests).
/// </summary>
public class Customer
{
    public Guid Id { get; init; } = Guid.NewGuid();

    /// <summary>Foreign key to <see cref="User"/>.</summary>
    public Guid UserId { get; set; }

    public DateOnly? BirthDate { get; set; }

    /// <summary>Internal notes visible only to administrators.</summary>
    public string? Notes { get; set; }

    // ── Navigation properties ──────────────────────────────────────────────────
    public User User { get; set; } = null!;
    public ICollection<Service> Services { get; set; } = [];
    public ICollection<Appointment> Appointments { get; set; } = [];
    public ICollection<Conversation> Conversations { get; set; } = [];
}
