using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;
using WorkEz.Domain.Interfaces;
using WorkEz.Domain.Services;

namespace WorkEz.Infra.Data.Services;

/// <summary>
/// Infrastructure service for sending emails via SMTP or logging output in development mode.
/// </summary>
public class SmtpEmailService(IConfiguration configuration, ILogger<SmtpEmailService> logger) : IEmailService
{
    private readonly IConfiguration _configuration = configuration;
    private readonly ILogger<SmtpEmailService> _logger = logger;

    public async Task SendEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        var smtpHost = _configuration["Smtp:Host"];
        var smtpPortString = _configuration["Smtp:Port"];
        var smtpUser = _configuration["Smtp:Username"];
        var smtpPass = _configuration["Smtp:Password"];
        var fromEmail = _configuration["Smtp:FromEmail"] ?? "no-reply@workez.com.br";
        var fromName = _configuration["Smtp:FromName"] ?? "WorkEz Plataforma";

        if (string.IsNullOrWhiteSpace(smtpHost) || string.IsNullOrWhiteSpace(smtpUser))
        {
            _logger.LogInformation("===============================================================================");
            _logger.LogInformation("[DEV EMAIL SIMULATOR] To: {ToEmail} | Subject: {Subject}", toEmail, subject);
            _logger.LogInformation("[DEV EMAIL BODY PREVIEW]: {HtmlBodyPreview}", htmlBody.Length > 200 ? htmlBody[..200] + "..." : htmlBody);
            _logger.LogInformation("===============================================================================");
            return;
        }

        try
        {
            int port = int.TryParse(smtpPortString, out var p) ? p : 587;

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromEmail));
            message.To.Add(new MailboxAddress(toEmail, toEmail));
            message.Subject = subject;

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = htmlBody
            };
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            client.Timeout = 15000;

            var secureSocketOptions = port == 465 
                ? SecureSocketOptions.SslOnConnect 
                : SecureSocketOptions.StartTlsWhenAvailable;

            await client.ConnectAsync(smtpHost, port, secureSocketOptions, cancellationToken);

            if (!string.IsNullOrWhiteSpace(smtpUser) && !string.IsNullOrWhiteSpace(smtpPass))
            {
                await client.AuthenticateAsync(smtpUser, smtpPass, cancellationToken);
            }

            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);

            _logger.LogInformation("✅ Email enviado com sucesso via SMTP ({Host}:{Port}) para {ToEmail} com o assunto '{Subject}'.", smtpHost, port, toEmail, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Falha ao enviar email via SMTP ({Host}) para {ToEmail}: {ErrorMessage}", smtpHost, toEmail, ex.Message);
            // Fallback non-throwing logging so transactional flows never crash due to external SMTP glitches
        }
    }

    public async Task SendProposalNotificationAsync(string clientEmail, string clientName, string providerName, string serviceTitle, decimal proposedPrice, string? description, CancellationToken cancellationToken = default)
    {
        var subject = $"💬 Nova proposta para seu serviço: {serviceTitle}";
        var htmlBody = EmailTemplateFactory.BuildProposalNotificationTemplate(clientName, providerName, serviceTitle, proposedPrice, description);
        await SendEmailAsync(clientEmail, subject, htmlBody, cancellationToken);
    }

    public async Task SendProposalAcceptedNotificationAsync(string providerEmail, string providerName, string clientName, string serviceTitle, decimal agreedPrice, string confirmationCode, CancellationToken cancellationToken = default)
    {
        var subject = $"🎉 Sua proposta foi aceita para: {serviceTitle}";
        var htmlBody = EmailTemplateFactory.BuildProposalAcceptedTemplate(providerName, clientName, serviceTitle, agreedPrice, confirmationCode);
        await SendEmailAsync(providerEmail, subject, htmlBody, cancellationToken);
    }

    public async Task SendProposalRejectedNotificationAsync(string providerEmail, string providerName, string serviceTitle, string? reason, CancellationToken cancellationToken = default)
    {
        var subject = $"Atualização sobre a proposta do serviço: {serviceTitle}";
        var htmlBody = EmailTemplateFactory.BuildProposalRejectedTemplate(providerName, serviceTitle, reason);
        await SendEmailAsync(providerEmail, subject, htmlBody, cancellationToken);
    }

    public async Task SendOrderStatusUpdatedNotificationAsync(string recipientEmail, string recipientName, string serviceTitle, string oldStatus, string newStatus, string? observations = null, CancellationToken cancellationToken = default)
    {
        var subject = $"🔔 Atualização de Status: {serviceTitle} ({newStatus})";
        var htmlBody = EmailTemplateFactory.BuildOrderStatusUpdatedTemplate(recipientName, serviceTitle, oldStatus, newStatus, observations);
        await SendEmailAsync(recipientEmail, subject, htmlBody, cancellationToken);
    }

    public async Task SendProviderAcceptedNotificationAsync(string clientEmail, string clientName, string providerName, string serviceTitle, decimal agreedPrice, DateTime? scheduledDate, CancellationToken cancellationToken = default)
    {
        var subject = $"🤝 Pedido confirmado por {providerName}: {serviceTitle}";
        var htmlBody = EmailTemplateFactory.BuildProviderAcceptedTemplate(clientName, providerName, serviceTitle, agreedPrice, scheduledDate);
        await SendEmailAsync(clientEmail, subject, htmlBody, cancellationToken);
    }

    public async Task SendPaymentCompletedNotificationAsync(string recipientEmail, string recipientName, string serviceTitle, decimal amount, string paymentMethod, string transactionId, CancellationToken cancellationToken = default)
    {
        var subject = $"💳 Comprovante de Pagamento Confirmado: {serviceTitle}";
        var htmlBody = EmailTemplateFactory.BuildPaymentCompletedTemplate(recipientName, serviceTitle, amount, paymentMethod, transactionId);
        await SendEmailAsync(recipientEmail, subject, htmlBody, cancellationToken);
    }

    public async Task SendPixInvoiceNotificationAsync(string clientEmail, string clientName, string serviceTitle, decimal totalAmount, string pixCopiaECola, string? qrCodeBase64, DateTime expiresAt, CancellationToken cancellationToken = default)
    {
        var subject = $"Pague via PIX o servico concluido: {serviceTitle}";
        var htmlBody = EmailTemplateFactory.BuildPixInvoiceTemplate(clientName, serviceTitle, totalAmount, pixCopiaECola, qrCodeBase64, expiresAt);
        await SendEmailAsync(clientEmail, subject, htmlBody, cancellationToken);
    }

    public async Task SendWelcomeNotificationAsync(string userEmail, string userName, string userRole, CancellationToken cancellationToken = default)
    {
        var subject = $"🚀 Bem-vindo(a) ao WorkEz, {userName}!";
        var htmlBody = EmailTemplateFactory.BuildWelcomeUserTemplate(userName, userRole);
        await SendEmailAsync(userEmail, subject, htmlBody, cancellationToken);
    }
}
