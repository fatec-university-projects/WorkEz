namespace WorkEz.Api.Enums;

/// <summary>
/// Tracks the lifecycle state of a service request.
/// </summary>
public enum ServiceStatus
{
    Open = 0,
    UnderNegotiation = 1,
    Accepted = 2,
    InProgress = 3,
    Completed = 4,
    Cancelled = 5,
    OnTheWay = 6,
    WaitingPayment = 7
}
