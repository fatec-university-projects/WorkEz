using Microsoft.EntityFrameworkCore;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Interfaces;
using WorkEz.Domain.Services;
using WorkEz.Infra.Data.Context;
using WorkEz.Infra.Data.Repositories;
using Xunit;
using ServiceProviderEntity = WorkEz.Domain.Entities.ServiceProvider;

namespace WorkEz.WebUID.Tests;

public class EmailFlowTests
{
    // ── Templates ───────────────────────────────────────────────────────────

    [Fact]
    public void Template_OrderStatusUpdated_ShouldContainAllData()
    {
        var html = EmailTemplateFactory.BuildOrderStatusUpdatedTemplate(
            recipientName: "Maria Silva",
            serviceTitle: "Instalação Elétrica Residencial",
            oldStatus: "Open",
            newStatus: "InProgress",
            observations: "Técnico já a caminho com os equipamentos.");

        Assert.Contains("Maria Silva", html);
        Assert.Contains("Instalação Elétrica Residencial", html);
        Assert.Contains("Open", html);
        Assert.Contains("InProgress", html);
        Assert.Contains("Técnico já a caminho", html);
        Assert.Contains("<!DOCTYPE html>", html);
    }

    [Fact]
    public void Template_ProviderAccepted_ShouldContainAllData()
    {
        var html = EmailTemplateFactory.BuildProviderAcceptedTemplate(
            clientName: "Carlos Souza",
            providerName: "João Eletricista",
            serviceTitle: "Conserto de Ar Condicionado",
            agreedPrice: 350.00m,
            scheduledDate: new DateTime(2026, 11, 20, 14, 0, 0));

        Assert.Contains("Carlos Souza", html);
        Assert.Contains("João Eletricista", html);
        Assert.Contains("Conserto de Ar Condicionado", html);
        Assert.Contains("350,00", html);
        Assert.Contains("20/11/2026 14:00", html);
    }

    [Fact]
    public void Template_PaymentCompleted_ShouldContainAllData()
    {
        var html = EmailTemplateFactory.BuildPaymentCompletedTemplate(
            recipientName: "Carlos Souza",
            serviceTitle: "Pintura de Fachada",
            amount: 1200.50m,
            paymentMethod: "Pix",
            transactionId: "TX-998877");

        Assert.Contains("Carlos Souza", html);
        Assert.Contains("Pintura de Fachada", html);
        Assert.Contains("1.200,50", html);
        Assert.Contains("Pix", html);
        Assert.Contains("#TX-998877", html);
    }

    [Fact]
    public void Template_WelcomeUser_ShouldContainNameAndRole()
    {
        var html = EmailTemplateFactory.BuildWelcomeUserTemplate("Fernanda Costa", "ServiceProvider");

        Assert.Contains("Fernanda Costa", html);
        Assert.Contains("ServiceProvider", html);
        Assert.Contains("prestador de serviços", html);
    }

    // ── Fluxos de aplicação ─────────────────────────────────────────────────

    private class TrackingEmailService : IEmailService
    {
        public List<(string To, string Subject)> Sent { get; } = [];
        public List<(string To, string NewStatus)> StatusUpdates { get; } = [];
        public List<string> Welcomes { get; } = [];
        public List<string> Payments { get; } = [];
        public List<(string To, decimal Amount, string PixCopiaECola)> PixInvoices { get; } = [];

        private Task Track(string to, string subject)
        {
            Sent.Add((to, subject));
            return Task.CompletedTask;
        }

        public Task SendEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default)
            => Track(toEmail, subject);

        public Task SendProposalNotificationAsync(string clientEmail, string clientName, string providerName, string serviceTitle, decimal proposedPrice, string? description, CancellationToken cancellationToken = default)
            => Track(clientEmail, "proposal");

        public Task SendProposalAcceptedNotificationAsync(string providerEmail, string providerName, string clientName, string serviceTitle, decimal agreedPrice, string confirmationCode, CancellationToken cancellationToken = default)
            => Track(providerEmail, "proposal-accepted");

        public Task SendProposalRejectedNotificationAsync(string providerEmail, string providerName, string serviceTitle, string? reason, CancellationToken cancellationToken = default)
            => Track(providerEmail, "proposal-rejected");

        public async Task SendOrderStatusUpdatedNotificationAsync(string recipientEmail, string recipientName, string serviceTitle, string oldStatus, string newStatus, string? observations = null, CancellationToken cancellationToken = default)
        {
            await Track(recipientEmail, "status");
            StatusUpdates.Add((recipientEmail, newStatus));
        }

        public Task SendProviderAcceptedNotificationAsync(string clientEmail, string clientName, string providerName, string serviceTitle, decimal agreedPrice, DateTime? scheduledDate, CancellationToken cancellationToken = default)
            => Track(clientEmail, "provider-accepted");

        public async Task SendPaymentCompletedNotificationAsync(string recipientEmail, string recipientName, string serviceTitle, decimal amount, string paymentMethod, string transactionId, CancellationToken cancellationToken = default)
        {
            await Track(recipientEmail, "payment");
            Payments.Add(recipientEmail);
        }

        public async Task SendPixInvoiceNotificationAsync(string clientEmail, string clientName, string serviceTitle, decimal totalAmount, string pixCopiaECola, string? qrCodeBase64, DateTime expiresAt, CancellationToken cancellationToken = default)
        {
            await Track(clientEmail, "pix-invoice");
            PixInvoices.Add((clientEmail, totalAmount, pixCopiaECola));
        }

        public async Task SendWelcomeNotificationAsync(string userEmail, string userName, string userRole, CancellationToken cancellationToken = default)
        {
            await Track(userEmail, "welcome");
            Welcomes.Add(userEmail);
        }
    }

    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static ServiceApplicationService CreateServiceApp(AppDbContext db, IEmailService? email, IWalletApplicationService? wallet = null) =>
        new(
            new ServiceRepository(db),
            new AppointmentRepository(db),
            new ServiceProviderRepository(db),
            new BaseRepository<Customer>(db),
            new BaseRepository<Address>(db),
            new BaseRepository<User>(db),
            walletService: wallet,
            emailService: email);

    private static WalletApplicationService CreateWallet(AppDbContext db, IEmailService? email) =>
        new(
            new WalletTransactionRepository(db),
            new WithdrawalRequestRepository(db),
            new ServiceProviderRepository(db),
            new ServiceRepository(db),
            new AppointmentRepository(db),
            new ProposalRepository(db),
            customerRepository: new CustomerRepository(db),
            emailService: email);

    private static async Task<(Service service, User clientUser, User providerUser)> SeedServiceAsync(
        AppDbContext db, ServiceStatus status, decimal? finalPrice = null)
    {
        var providerUser = new User { Id = Guid.NewGuid(), Name = "Prestador", Email = "prestador@teste.com", Role = UserRole.ServiceProvider };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = providerUser.Id, User = providerUser };
        var clientUser = new User { Id = Guid.NewGuid(), Name = "Cliente", Email = "cliente@teste.com" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = clientUser.Id, User = clientUser };

        var service = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Customer = customer,
            ServiceStatus = status,
            Title = "Manutenção Hidráulica"
        };
        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            ProviderId = provider.Id,
            Provider = provider,
            CustomerId = customer.Id,
            FinalPrice = finalPrice ?? 0m,
            AppointmentStatus = AppointmentStatus.Confirmed
        };

        db.Users.AddRange(providerUser, clientUser);
        db.Providers.Add(provider);
        db.Customers.Add(customer);
        db.Services.Add(service);
        db.Appointments.Add(appointment);
        await db.SaveChangesAsync();
        return (service, clientUser, providerUser);
    }

    [Fact]
    public async Task StartDisplacement_ShouldEmailCustomerAboutStatus()
    {
        using var db = CreateDb();
        var email = new TrackingEmailService();
        var (service, clientUser, providerUser) = await SeedServiceAsync(db, ServiceStatus.Accepted);

        var result = await CreateServiceApp(db, email).StartDisplacementAsync(service.Id, providerUser.Id, false);

        Assert.True(result.IsSuccess);
        var update = Assert.Single(email.StatusUpdates);
        Assert.Equal(clientUser.Email, update.To);
        Assert.Equal("OnTheWay", update.NewStatus);
    }

    [Fact]
    public async Task CompleteService_ShouldEmailCustomerTheDelFinancePix()
    {
        using var db = CreateDb();
        var email = new TrackingEmailService();
        var (service, clientUser, providerUser) = await SeedServiceAsync(db, ServiceStatus.InProgress);

        var result = await CreateServiceApp(db, email, CreateWallet(db, email))
            .CompleteServiceAsync(service.Id, 450m, providerUser.Id, false);

        Assert.True(result.IsSuccess);
        Assert.Equal("waiting-payment", result.Value!.Status);

        var invoice = Assert.Single(email.PixInvoices);
        Assert.Equal(clientUser.Email, invoice.To);
        Assert.Equal(450m, invoice.Amount);
        Assert.False(string.IsNullOrWhiteSpace(invoice.PixCopiaECola));
        // o PIX substitui o aviso genérico de status (sem e-mail duplicado)
        Assert.Empty(email.StatusUpdates);
    }

    [Fact]
    public async Task CompleteService_WhenPixEmailFails_ShouldFallBackToStatusEmail()
    {
        using var db = CreateDb();
        var (service, clientUser, providerUser) = await SeedServiceAsync(db, ServiceStatus.InProgress);
        // wallet sem e-mail => não consegue enviar o PIX; o serviço ainda deve avisar o cliente
        var email = new TrackingEmailService();

        var result = await CreateServiceApp(db, email, CreateWallet(db, null))
            .CompleteServiceAsync(service.Id, 450m, providerUser.Id, false);

        Assert.True(result.IsSuccess);
        Assert.Empty(email.PixInvoices);
        var update = Assert.Single(email.StatusUpdates);
        Assert.Equal(clientUser.Email, update.To);
        Assert.Equal("WaitingPayment", update.NewStatus);
    }

    [Fact]
    public void Template_PixInvoice_ShouldContainPixAndAmount()
    {
        var html = EmailTemplateFactory.BuildPixInvoiceTemplate(
            "Carlos Souza", "Pintura de Fachada", 1200.50m,
            "00020126PIXCOPIAECOLA6304ABCD", "iVBORw0KGgo=", new DateTime(2026, 11, 20, 17, 0, 0, DateTimeKind.Utc));

        Assert.Contains("Carlos Souza", html);
        Assert.Contains("Pintura de Fachada", html);
        Assert.Contains("1.200,50", html);
        Assert.Contains("00020126PIXCOPIAECOLA6304ABCD", html);
        Assert.Contains("data:image/png;base64,iVBORw0KGgo=", html);
    }
    [Fact]
    public async Task CompleteService_ShouldEmailCustomerThatPaymentIsWaiting()
    {
        using var db = CreateDb();
        var email = new TrackingEmailService();
        var (service, clientUser, providerUser) = await SeedServiceAsync(db, ServiceStatus.InProgress);

        var result = await CreateServiceApp(db, email).CompleteServiceAsync(service.Id, 450m, providerUser.Id, false);

        Assert.True(result.IsSuccess);
        var update = Assert.Single(email.StatusUpdates);
        Assert.Equal(clientUser.Email, update.To);
        Assert.Equal("WaitingPayment", update.NewStatus);
    }

    [Fact]
    public async Task ConfirmPayment_ShouldSendReceiptToCustomerAndProvider()
    {
        using var db = CreateDb();
        var email = new TrackingEmailService();
        var (service, clientUser, providerUser) = await SeedServiceAsync(db, ServiceStatus.WaitingPayment, 450m);

        var result = await CreateServiceApp(db, email).ConfirmPaymentAsync(service.Id, clientUser.Id, false);

        Assert.True(result.IsSuccess);
        Assert.Contains(clientUser.Email, email.Payments);
        Assert.Contains(providerUser.Email, email.Payments);
        Assert.Contains(email.StatusUpdates, s => s.NewStatus == "Completed" && s.To == clientUser.Email);
    }

    [Fact]
    public async Task CancelService_ShouldNotifyCustomerAndProvider()
    {
        using var db = CreateDb();
        var email = new TrackingEmailService();
        var (service, clientUser, providerUser) = await SeedServiceAsync(db, ServiceStatus.Accepted);

        var result = await CreateServiceApp(db, email).UpdateStatusAsync(service.Id, false, clientUser.Id, false);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, email.StatusUpdates.Count(s => s.NewStatus == "Cancelled"));
        Assert.Contains(email.StatusUpdates, s => s.To == providerUser.Email);
    }


    [Fact]
    public async Task ServiceFlow_WithoutEmailService_ShouldStillWork()
    {
        using var db = CreateDb();
        var (service, _, providerUser) = await SeedServiceAsync(db, ServiceStatus.Accepted);

        var result = await CreateServiceApp(db, null).StartDisplacementAsync(service.Id, providerUser.Id, false);

        Assert.True(result.IsSuccess);
    }

    private static AuthApplicationService CreateAuth(AppDbContext db, IEmailService? email) =>
        new(
            new UserRepository(db),
            new BaseRepository<Customer>(db),
            new BaseRepository<ServiceProviderEntity>(db),
            new RefreshTokenRepository(db),
            tokenService: null!,
            new PasswordHasher(),
            email);

    [Fact]
    public async Task RegisterCustomer_ShouldSendWelcomeEmail()
    {
        using var db = CreateDb();
        var email = new TrackingEmailService();

        var result = await CreateAuth(db, email)
            .RegisterCustomerAsync(new RegisterCustomerRequest("Ana Clara", "anaclara@workez.com", "senha123", "11999998888"));

        Assert.True(result.IsSuccess);
        Assert.Equal("anaclara@workez.com", Assert.Single(email.Welcomes));
    }

    [Fact]
    public async Task RegisterProvider_ShouldSendWelcomeEmail()
    {
        using var db = CreateDb();
        var email = new TrackingEmailService();

        var result = await CreateAuth(db, email)
            .RegisterProviderAsync(new RegisterProviderRequest("João Eletricista", "joao@workez.com", "senha123", "11999998888", null));

        Assert.True(result.IsSuccess);
        Assert.Equal("joao@workez.com", Assert.Single(email.Welcomes));
    }


}
