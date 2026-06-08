using WorkEz.Api.Enums;

namespace WorkEz.Api.Entities;

/// <summary>
/// Join entity linking a <see cref="ServiceProvider"/> to the <see cref="Category"/> types they serve.
/// </summary>
public class ProviderCategory
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid ProviderId { get; set; }

    public Guid CategoryId { get; set; }

    public CategoryStatus Status { get; set; } = CategoryStatus.Active;

    // ── Navigation properties ──────────────────────────────────────────────────
    public ServiceProvider Provider { get; set; } = null!;
    public Category Category { get; set; } = null!;
}
