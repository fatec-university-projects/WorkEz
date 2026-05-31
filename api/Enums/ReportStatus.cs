namespace WorkEz.Api.Enums;

/// <summary>
/// Tracks the handling state of a user report / complaint.
/// </summary>
public enum ReportStatus
{
    Open = 0,
    UnderReview = 1,
    Resolved = 2,
    Rejected = 3
}
