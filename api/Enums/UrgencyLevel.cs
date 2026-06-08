namespace WorkEz.Api.Enums;

/// <summary>
/// Indicates how urgently the customer needs the service to be performed.
/// </summary>
public enum UrgencyLevel
{
    /// <summary>No particular rush; flexible scheduling.</summary>
    Low = 0,

    /// <summary>Should be scheduled within a few days.</summary>
    Medium = 1,

    /// <summary>Needs to happen as soon as possible (same day or next day).</summary>
    High = 2,

    /// <summary>Emergency — immediate response required.</summary>
    Emergency = 3
}
