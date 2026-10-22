namespace WorkEz.Domain.Interfaces;

/// <summary>
/// Domain interface for sending transactional emails and notification alerts.
/// </summary>
public interface IEmailService
{
    Task SendEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default);
    Task SendProposalNotificationAsync(string clientEmail, string clientName, string providerName, string serviceTitle, decimal proposedPrice, string? description, CancellationToken cancellationToken = default);
    Task SendProposalAcceptedNotificationAsync(string providerEmail, string providerName, string clientName, string serviceTitle, decimal agreedPrice, string confirmationCode, CancellationToken cancellationToken = default);
    Task SendProposalRejectedNotificationAsync(string providerEmail, string providerName, string serviceTitle, string? reason, CancellationToken cancellationToken = default);

    Task SendOrderStatusUpdatedNotificationAsync(string recipientEmail, string recipientName, string serviceTitle, string oldStatus, string newStatus, string? observations = null, CancellationToken cancellationToken = default);
    Task SendProviderAcceptedNotificationAsync(string clientEmail, string clientName, string providerName, string serviceTitle, decimal agreedPrice, DateTime? scheduledDate, CancellationToken cancellationToken = default);
    Task SendPaymentCompletedNotificationAsync(string recipientEmail, string recipientName, string serviceTitle, decimal amount, string paymentMethod, string transactionId, CancellationToken cancellationToken = default);
    Task SendPixInvoiceNotificationAsync(string clientEmail, string clientName, string serviceTitle, decimal totalAmount, string pixCopiaECola, string? qrCodeBase64, DateTime expiresAt, CancellationToken cancellationToken = default);
    Task SendWelcomeNotificationAsync(string userEmail, string userName, string userRole, CancellationToken cancellationToken = default);
}
