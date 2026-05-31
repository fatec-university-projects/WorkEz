namespace WorkEz.Api.Enums;

/// <summary>
/// Classifies what kind of event triggered a notification.
/// </summary>
public enum NotificationType
{
    NewService = 0,
    NewProposal = 1,
    ProposalAccepted = 2,
    NewMessage = 3,
    PaymentConfirmed = 4,
    ServiceCompleted = 5,
    ReportUpdated = 6
}
