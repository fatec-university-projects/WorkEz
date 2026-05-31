namespace WorkEz.Api.Enums;

/// <summary>
/// Tracks the state of a confirmed appointment between customer and provider.
/// </summary>
public enum AppointmentStatus
{
    Confirmed = 0,
    InProgress = 1,
    Completed = 2,
    Cancelled = 3
}
