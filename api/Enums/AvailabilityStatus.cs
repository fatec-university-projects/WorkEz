namespace WorkEz.Api.Enums;

/// <summary>
/// Indicates whether a service provider is currently available to receive new service requests.
/// </summary>
public enum AvailabilityStatus
{
    /// <summary>Provider is online and accepting new proposals.</summary>
    Available = 0,

    /// <summary>Provider is temporarily unavailable (e.g. on vacation, full schedule).</summary>
    Unavailable = 1,

    /// <summary>Provider is busy executing an ongoing appointment.</summary>
    Busy = 2
}
