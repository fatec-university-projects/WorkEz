using Microsoft.AspNetCore.Mvc;
using WorkEz.Domain.Interfaces;
using WorkEz.WebUID.Auth;

namespace WorkEz.WebUID.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmailsController(IEmailService emailService, IWebHostEnvironment? env = null) : ControllerBase
{
    private readonly IEmailService _emailService = emailService;
    private readonly IWebHostEnvironment? _env = env;

    /// <summary>
    /// Endpoint de teste e diagnóstico para disparo imediato de e-mails via SMTP com templates estilizados.
    /// Em produção exige usuário autenticado; em desenvolvimento aceita chamadas diretas para diagnóstico local.
    /// </summary>
    /// <param name="request">Parâmetros do e-mail de teste.</param>
    /// <returns>Resultado da solicitação de envio.</returns>
    [HttpPost("test-send")]
    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    public async Task<IActionResult> TestSendEmail([FromBody] TestEmailRequest request)
    {
        var isDev = _env == null || _env.IsDevelopment();
        if (!isDev && User.GetUserId() == null)
        {
            return Unauthorized(new { error = "Autenticação obrigatória para disparo de e-mail de teste fora do ambiente de desenvolvimento." });
        }

        if (string.IsNullOrWhiteSpace(request.ToEmail))
        {
            return BadRequest(new { error = "O campo toEmail é obrigatório." });
        }

        var recipientName = request.RecipientName ?? "Usuário WorkEz";
        var type = request.EmailType?.ToLowerInvariant() ?? "welcome";

        switch (type)
        {
            case "status":
                await _emailService.SendOrderStatusUpdatedNotificationAsync(
                    recipientEmail: request.ToEmail,
                    recipientName: recipientName,
                    serviceTitle: "Instalação de Bancada em Granito",
                    oldStatus: "Aberto",
                    newStatus: "Em Andamento",
                    observations: "O prestador iniciou o deslocamento até o endereço."
                );
                break;

            case "provider-accept":
                await _emailService.SendProviderAcceptedNotificationAsync(
                    clientEmail: request.ToEmail,
                    clientName: recipientName,
                    providerName: "Marcenaria Silva & Cia",
                    serviceTitle: "Montagem de Armários Planejados",
                    agreedPrice: 1250.00m,
                    scheduledDate: DateTime.UtcNow.AddDays(2)
                );
                break;

            case "payment":
                await _emailService.SendPaymentCompletedNotificationAsync(
                    recipientEmail: request.ToEmail,
                    recipientName: recipientName,
                    serviceTitle: "Pintura Residencial Interna",
                    amount: 890.00m,
                    paymentMethod: "Pix",
                    transactionId: "TX-" + Guid.NewGuid().ToString("N")[..8].ToUpper()
                );
                break;

            case "proposal":
                await _emailService.SendProposalNotificationAsync(
                    clientEmail: request.ToEmail,
                    clientName: recipientName,
                    providerName: "Eletrotécnica Volt",
                    serviceTitle: "Instalação de Quadro de Força",
                    proposedPrice: 420.00m,
                    description: "Inclui disjuntores e fiação certificada."
                );
                break;

            case "welcome":
            default:
                await _emailService.SendWelcomeNotificationAsync(
                    userEmail: request.ToEmail,
                    userName: recipientName,
                    userRole: "Cliente"
                );
                break;
        }

        return Ok(new
        {
            success = true,
            message = $"Disparo de e-mail do tipo '{type}' executado com sucesso para '{request.ToEmail}'.",
            recipient = request.ToEmail,
            emailType = type,
            dispatchedAt = DateTime.UtcNow
        });
    }
}

public record TestEmailRequest(
    string ToEmail,
    string? RecipientName,
    string? EmailType // "welcome", "status", "provider-accept", "payment", "proposal"
);
