namespace WorkEz.Domain.Services;

/// <summary>
/// Factory for generating responsive HTML transactional email templates for WorkEz.
/// </summary>
public static class EmailTemplateFactory
{
    public static string BuildProposalNotificationTemplate(string clientName, string providerName, string serviceTitle, decimal proposedPrice, string? description)
    {
        string descHtml = !string.IsNullOrWhiteSpace(description)
            ? $"<p style=\"margin: 12px 0 0 0; color: #475569; font-size: 14px;\"><strong>Observações do Prestador:</strong> {description}</p>"
            : string.Empty;

        return BuildBaseLayout(
            title: "Nova Proposta Recebida!",
            subtitle: $"Olá, {clientName}! Você recebeu um orçamento para seu serviço.",
            contentHtml: $@"
                <div style=""background-color: #F8FAFC; border-radius: 12px; padding: 20px; border: 1px solid #E2E8F0; margin-bottom: 24px;"">
                    <h3 style=""margin: 0 0 8px 0; color: #1E293B; font-size: 18px;"">{serviceTitle}</h3>
                    <p style=""margin: 0 0 16px 0; color: #64748B; font-size: 14px;"">Prestador: <strong>{providerName}</strong></p>
                    <div style=""background-color: #EFF6FF; border-left: 4px solid #2563EB; padding: 12px 16px; border-radius: 6px;"">
                        <span style=""font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #1D4ED8; font-weight: 600;"">Valor Proposto</span>
                        <div style=""font-size: 26px; font-weight: 800; color: #1E3A8A; margin-top: 4px;"">R$ {proposedPrice:N2}</div>
                    </div>
                    {descHtml}
                </div>
                <p style=""color: #334155; font-size: 15px; line-height: 1.6;"">
                    Acesse o app WorkEz para analisar os detalhes desta proposta, aceitar ou continuar a negociação diretamente com o prestador.
                </p>
            ",
            ctaText: "Ver Proposta no WorkEz",
            ctaUrl: "workezapp://client/services"
        );
    }

    public static string BuildProposalAcceptedTemplate(string providerName, string clientName, string serviceTitle, decimal agreedPrice, string confirmationCode)
    {
        return BuildBaseLayout(
            title: "Proposta Aceita! 🎉",
            subtitle: $"Parabéns, {providerName}! O cliente aceitou o seu orçamento.",
            contentHtml: $@"
                <div style=""background-color: #F0FDF4; border-radius: 12px; padding: 20px; border: 1px solid #BBF7D0; margin-bottom: 24px;"">
                    <h3 style=""margin: 0 0 8px 0; color: #14532D; font-size: 18px;"">{serviceTitle}</h3>
                    <p style=""margin: 0 0 16px 0; color: #15803D; font-size: 14px;"">Cliente: <strong>{clientName}</strong></p>
                    <div style=""display: flex; gap: 12px; margin-bottom: 12px;"">
                        <div style=""background-color: #DCFCE7; padding: 12px 16px; border-radius: 8px; flex: 1;"">
                            <span style=""font-size: 11px; text-transform: uppercase; color: #166534; font-weight: 700;"">Valor Fechado</span>
                            <div style=""font-size: 22px; font-weight: 800; color: #14532D; margin-top: 2px;"">R$ {agreedPrice:N2}</div>
                        </div>
                        <div style=""background-color: #FEF3C7; padding: 12px 16px; border-radius: 8px; flex: 1;"">
                            <span style=""font-size: 11px; text-transform: uppercase; color: #92400E; font-weight: 700;"">Código de Confirmação</span>
                            <div style=""font-size: 22px; font-weight: 800; color: #78350F; margin-top: 2px;"">#{confirmationCode}</div>
                        </div>
                    </div>
                </div>
                <p style=""color: #334155; font-size: 15px; line-height: 1.6;"">
                    O serviço está agendado e confirmado! Guarde o código de confirmação para informar ao cliente ao concluir o trabalho.
                </p>
            ",
            ctaText: "Abrir Detalhes do Serviço",
            ctaUrl: "workezapp://provider/calls"
        );
    }

    public static string BuildProposalRejectedTemplate(string providerName, string serviceTitle, string? reason)
    {
        string reasonHtml = !string.IsNullOrWhiteSpace(reason)
            ? $"<p style=\"margin: 12px 0 0 0; color: #B91C1C; font-size: 14px;\"><strong>Motivo informado:</strong> {reason}</p>"
            : string.Empty;

        return BuildBaseLayout(
            title: "Atualização de Proposta",
            subtitle: $"Olá, {providerName}. O cliente não aceitou o orçamento enviado.",
            contentHtml: $@"
                <div style=""background-color: #FEF2F2; border-radius: 12px; padding: 20px; border: 1px solid #FECACA; margin-bottom: 24px;"">
                    <h3 style=""margin: 0 0 8px 0; color: #7F1D1D; font-size: 18px;"">{serviceTitle}</h3>
                    {reasonHtml}
                </div>
                <p style=""color: #334155; font-size: 15px; line-height: 1.6;"">
                    Não se preocupe! Existem várias outras chamadas de clientes disponíveis para você no painel do WorkEz.
                </p>
            ",
            ctaText: "Buscar Novos Serviços",
            ctaUrl: "workezapp://provider/calls"
        );
    }

    public static string BuildOrderStatusUpdatedTemplate(string recipientName, string serviceTitle, string oldStatus, string newStatus, string? observations)
    {
        string obsHtml = !string.IsNullOrWhiteSpace(observations)
            ? $"<p style=\"margin: 14px 0 0 0; color: #475569; font-size: 14px;\"><strong>Observações:</strong> {observations}</p>"
            : string.Empty;

        return BuildBaseLayout(
            title: "Atualização no Status do Pedido",
            subtitle: $"Olá, {recipientName}! O status do seu serviço foi atualizado.",
            contentHtml: $@"
                <div style=""background-color: #F8FAFC; border-radius: 12px; padding: 20px; border: 1px solid #E2E8F0; margin-bottom: 24px;"">
                    <h3 style=""margin: 0 0 12px 0; color: #1E293B; font-size: 18px;"">{serviceTitle}</h3>
                    <div style=""display: flex; align-items: center; gap: 10px; margin-bottom: 12px;"">
                        <span style=""background-color: #E2E8F0; color: #475569; font-size: 13px; font-weight: 600; padding: 6px 12px; border-radius: 6px;"">{oldStatus}</span>
                        <span style=""color: #2563EB; font-weight: 800; font-size: 16px;"">➔</span>
                        <span style=""background-color: #DBEAFE; color: #1D4ED8; font-size: 13px; font-weight: 700; padding: 6px 12px; border-radius: 6px;"">{newStatus}</span>
                    </div>
                    {obsHtml}
                </div>
                <p style=""color: #334155; font-size: 15px; line-height: 1.6;"">
                    Você pode acompanhar em tempo real todo o histórico e evolução do atendimento através do aplicativo WorkEz.
                </p>
            ",
            ctaText: "Acompanhar no WorkEz",
            ctaUrl: "workezapp://client/tracking"
        );
    }

    public static string BuildProviderAcceptedTemplate(string clientName, string providerName, string serviceTitle, decimal agreedPrice, DateTime? scheduledDate)
    {
        string dateFormatted = scheduledDate?.ToString("dd/MM/yyyy HH:mm") ?? "A combinar no chat";

        return BuildBaseLayout(
            title: "Fornecedor Confirmou seu Pedido! 🤝",
            subtitle: $"Excelente, {clientName}! O prestador aceitou realizar o serviço.",
            contentHtml: $@"
                <div style=""background-color: #F0FDF4; border-radius: 12px; padding: 20px; border: 1px solid #BBF7D0; margin-bottom: 24px;"">
                    <h3 style=""margin: 0 0 8px 0; color: #14532D; font-size: 18px;"">{serviceTitle}</h3>
                    <p style=""margin: 0 0 16px 0; color: #166534; font-size: 14px;"">Prestador Confirmado: <strong>{providerName}</strong></p>
                    <div style=""display: flex; gap: 12px; margin-bottom: 12px;"">
                        <div style=""background-color: #DCFCE7; padding: 12px 16px; border-radius: 8px; flex: 1;"">
                            <span style=""font-size: 11px; text-transform: uppercase; color: #166534; font-weight: 700;"">Valor Acordado</span>
                            <div style=""font-size: 22px; font-weight: 800; color: #14532D; margin-top: 2px;"">R$ {agreedPrice:N2}</div>
                        </div>
                        <div style=""background-color: #E0E7FF; padding: 12px 16px; border-radius: 8px; flex: 1;"">
                            <span style=""font-size: 11px; text-transform: uppercase; color: #3730A3; font-weight: 700;"">Data Agendada</span>
                            <div style=""font-size: 18px; font-weight: 700; color: #312E81; margin-top: 4px;"">{dateFormatted}</div>
                        </div>
                    </div>
                </div>
                <p style=""color: #334155; font-size: 15px; line-height: 1.6;"">
                    O prestador já foi alocado. Você pode conversar diretamente com ele pelo chat do WorkEz para tirar dúvidas ou alinhar a chegada.
                </p>
            ",
            ctaText: "Abrir Detalhes do Serviço",
            ctaUrl: "workezapp://client/services"
        );
    }

    public static string BuildPaymentCompletedTemplate(string recipientName, string serviceTitle, decimal amount, string paymentMethod, string transactionId)
    {
        return BuildBaseLayout(
            title: "Pagamento Concluído com Sucesso! 💳",
            subtitle: $"Olá, {recipientName}! O pagamento foi processado e confirmado.",
            contentHtml: $@"
                <div style=""background-color: #F8FAFC; border-radius: 12px; padding: 20px; border: 1px solid #E2E8F0; margin-bottom: 24px;"">
                    <h3 style=""margin: 0 0 8px 0; color: #1E293B; font-size: 18px;"">{serviceTitle}</h3>
                    <div style=""background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 14px 18px; border-radius: 6px; margin-bottom: 16px;"">
                        <span style=""font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #047857; font-weight: 700;"">Total Pago</span>
                        <div style=""font-size: 26px; font-weight: 800; color: #065F46; margin-top: 4px;"">R$ {amount:N2}</div>
                    </div>
                    <div style=""display: flex; justify-content: space-between; font-size: 13px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 12px;"">
                        <span>Método: <strong>{paymentMethod}</strong></span>
                        <span>Transação: <strong>#{transactionId}</strong></span>
                    </div>
                </div>
                <p style=""color: #334155; font-size: 15px; line-height: 1.6;"">
                    O valor foi retido com segurança pela plataforma e será liberado após a finalização e confirmação do serviço.
                </p>
            ",
            ctaText: "Visualizar Comprovante",
            ctaUrl: "workezapp://payments/history"
        );
    }

    public static string BuildWelcomeUserTemplate(string userName, string userRole)
    {
        string roleDescription = userRole.Equals("ServiceProvider", StringComparison.OrdinalIgnoreCase) || userRole.Equals("Prestador", StringComparison.OrdinalIgnoreCase)
            ? "Como prestador de serviços, você pode encontrar clientes na sua região, enviar orçamentos personalizados e gerenciar seus atendimentos com segurança."
            : "Como cliente, você pode solicitar orçamentos rápidos para reparos, reformas e serviços diversos com profissionais verificados e avaliados.";

        return BuildBaseLayout(
            title: "Bem-vindo(a) ao WorkEz! 🚀",
            subtitle: $"Olá, {userName}! Sua conta foi criada com sucesso.",
            contentHtml: $@"
                <div style=""background-color: #EFF6FF; border-radius: 12px; padding: 20px; border: 1px solid #BFDBFE; margin-bottom: 24px;"">
                    <h3 style=""margin: 0 0 8px 0; color: #1E3A8A; font-size: 18px;"">Perfil Cadastrado: {userRole}</h3>
                    <p style=""margin: 0; color: #1E40AF; font-size: 14px; line-height: 1.5;"">{roleDescription}</p>
                </div>
                <div style=""margin-bottom: 24px;"">
                    <h4 style=""margin: 0 0 8px 0; color: #0F172A; font-size: 15px;"">Próximos passos recomendados:</h4>
                    <ul style=""margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.6;"">
                        <li>Complete as informações do seu perfil</li>
                        <li>Explore as categorias e serviços disponíveis</li>
                        <li>Aproveite a garantia e segurança de pagamentos WorkEz</li>
                    </ul>
                </div>
            ",
            ctaText: "Começar no WorkEz",
            ctaUrl: "workezapp://home"
        );
    }

    private static string BuildBaseLayout(string title, string subtitle, string contentHtml, string ctaText, string ctaUrl)
    {
        return $@"
<!DOCTYPE html>
<html lang=""pt-BR"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>{title}</title>
</head>
<body style=""margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;"">
    <table role=""presentation"" style=""width: 100%; border-collapse: collapse; padding: 32px 16px;"">
        <tr>
            <td align=""center"">
                <table role=""presentation"" style=""width: 100%; max-width: 580px; border-collapse: collapse; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);"">
                    <!-- HEADER -->
                    <tr>
                        <td style=""background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%); padding: 32px 32px; text-align: center;"">
                            <h1 style=""margin: 0; color: #FFFFFF; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;"">WorkEz</h1>
                            <p style=""margin: 6px 0 0 0; color: #93C5FD; font-size: 14px; font-weight: 500;"">Conectando Soluções e Pessoas</p>
                        </td>
                    </tr>
                    <!-- BODY -->
                    <tr>
                        <td style=""padding: 36px 32px;"">
                            <h2 style=""margin: 0 0 6px 0; color: #0F172A; font-size: 22px; font-weight: 700;"">{title}</h2>
                            <p style=""margin: 0 0 24px 0; color: #64748B; font-size: 15px;"">{subtitle}</p>
                            
                            {contentHtml}
                            
                            <!-- CTA BUTTON -->
                            <div style=""margin-top: 32px; text-align: center;"">
                                <a href=""{ctaUrl}"" style=""display: inline-block; background-color: #2563EB; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);"">{ctaText}</a>
                            </div>
                        </td>
                    </tr>
                    <!-- FOOTER -->
                    <tr>
                        <td style=""background-color: #F8FAFC; padding: 24px 32px; text-align: center; border-top: 1px solid #E2E8F0;"">
                            <p style=""margin: 0; color: #94A3B8; font-size: 12px;"">© {DateTime.UtcNow.Year} WorkEz Tecnologia. Todos os direitos reservados.</p>
                            <p style=""margin: 4px 0 0 0; color: #CBD5E1; font-size: 11px;"">Este é um e-mail automático enviado pela plataforma WorkEz.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
    }
}
