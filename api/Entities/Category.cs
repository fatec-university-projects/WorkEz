using WorkEz.Api.Enums;

namespace WorkEz.Api.Entities;

/// <summary>
/// Represents a service category such as Electrical, Plumbing, or Painting.
/// </summary>
public class Category
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public CategoryStatus Status { get; set; } = CategoryStatus.Active;

    // ── Navigation properties ──────────────────────────────────────────────────
    public ICollection<ProviderCategory> ProviderCategories { get; set; } = [];
    public ICollection<Service> Services { get; set; } = [];
}
