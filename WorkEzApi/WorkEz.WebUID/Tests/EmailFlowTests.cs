using System.Linq.Expressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using ServiceProviderEntity = WorkEz.Domain.Entities.ServiceProvider;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Events;
using WorkEz.Domain.Interfaces;
using WorkEz.Domain.Services;
using WorkEz.Infra.Data.Services;
using Xunit;

namespace WorkEz.WebUID.Tests;

public class EmailFlowTests
{
    [Fact]
    public async Task Live_ResendSmtp_ShouldDispatchRealEmail()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"Smtp:Host", "smtp.resend.com"},
            {"Smtp:Port", "587"},
            {"Smtp:Username", "resend"},
            {"Smtp:Password", "re_ZaBDzcmF_MpePYk6ZG3FyBzQ2zFJqxwBg"},
            {"Smtp:FromEmail", "onboarding@resend.dev"},
            {"Smtp:FromName", "WorkEz Plataforma"},
            {"Smtp:EnableSsl", "true"}
        };

        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        using var loggerFactory = LoggerFactory.Create(builder => builder.AddConsole());
        var logger = loggerFactory.CreateLogger<SmtpEmailService>();

        var smtpService = new SmtpEmailService(config, logger);

        await smtpService.SendWelcomeNotificationAsync(
            userEmail: "no.reply.workez@gmail.com",
            userName: "Equipe WorkEz",
            userRole: "Administrador"
        );
    }
    [Fact]
    public void EmailTemplateFactory_ShouldGenerateValidOrderStatusUpdatedHtml()
    {
        // Act
        var html = EmailTemplateFactory.BuildOrderStatusUpdatedTemplate(
            recipientName: "Maria Silva",
            serviceTitle: "Instalação Elétrica Residencial",
            oldStatus: "Open",
            newStatus: "InProgress",
            observations: "Técnico já a caminho com os equipamentos."
        );

        // Assert
        Assert.NotNull(html);
        Assert.Contains("Maria Silva", html);
        Assert.Contains("Instalação Elétrica Residencial", html);
        Assert.Contains("Open", html);
        Assert.Contains("InProgress", html);
        Assert.Contains("Técnico já a caminho", html);
        Assert.Contains("<!DOCTYPE html>", html);
    }

    [Fact]
    public void EmailTemplateFactory_ShouldGenerateValidProviderAcceptedHtml()
    {
        // Act
        var html = EmailTemplateFactory.BuildProviderAcceptedTemplate(
            clientName: "Carlos Souza",
            providerName: "João Eletricista",
            serviceTitle: "Conserto de Ar Condicionado",
            agreedPrice: 350.00m,
            scheduledDate: new DateTime(2026, 11, 20, 14, 0, 0)
        );

        // Assert
        Assert.NotNull(html);
        Assert.Contains("Carlos Souza", html);
        Assert.Contains("João Eletricista", html);
        Assert.Contains("Conserto de Ar Condicionado", html);
        Assert.Contains("350,00", html);
        Assert.Contains("20/11/2026 14:00", html);
    }

    [Fact]
    public void EmailTemplateFactory_ShouldGenerateValidPaymentCompletedHtml()
    {
        // Act
        var html = EmailTemplateFactory.BuildPaymentCompletedTemplate(
            recipientName: "Carlos Souza",
            serviceTitle: "Pintura de Fachada",
            amount: 1200.50m,
            paymentMethod: "Pix",
            transactionId: "TX-998877"
        );

        // Assert
        Assert.NotNull(html);
        Assert.Contains("Carlos Souza", html);
        Assert.Contains("Pintura de Fachada", html);
        Assert.Contains("1.200,50", html);
        Assert.Contains("Pix", html);
        Assert.Contains("#TX-998877", html);
    }

    [Fact]
    public void EmailTemplateFactory_ShouldGenerateValidWelcomeUserHtml()
    {
        // Act
        var html = EmailTemplateFactory.BuildWelcomeUserTemplate(
            userName: "Fernanda Costa",
            userRole: "ServiceProvider"
        );

        // Assert
        Assert.NotNull(html);
        Assert.Contains("Fernanda Costa", html);
        Assert.Contains("ServiceProvider", html);
        Assert.Contains("prestador de serviços", html);
    }

    [Fact]
    public async Task ServiceDomainService_UpdateStatus_ShouldTriggerEmailAndEvent()
    {
        // Arrange
        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente Teste", Email = "cliente@teste.com" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };
        var service = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, Customer = customer, Title = "Manutenção Hidráulica", ServiceStatus = ServiceStatus.Open };

        var serviceRepo = new InMemoryServiceRepo([service]);
        var providerRepo = new InMemoryGenericRepo<ServiceProviderEntity>();
        var appointmentRepo = new InMemoryAppointmentRepo();
        var broker = new TestMessageBroker();
        var emailService = new TrackingEmailService();

        var domainService = new ServiceDomainService(serviceRepo, providerRepo, appointmentRepo, broker, emailService);

        // Act
        var result = await domainService.UpdateServiceStatusAsync(service.Id, ServiceStatus.InProgress, "Iniciando obras");

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(ServiceStatus.InProgress, service.ServiceStatus);
        Assert.Equal(1, emailService.OrderStatusUpdatedCalls);
        Assert.Single(broker.DispatchedEvents);
        Assert.IsType<OrderStatusUpdatedEvent>(broker.DispatchedEvents[0]);
    }

    [Fact]
    public async Task UserDomainService_RegisterUser_ShouldTriggerWelcomeEmailAndEvent()
    {
        // Arrange
        var userRepo = new InMemoryGenericRepo<User>();
        var customerRepo = new InMemoryGenericRepo<Customer>();
        var providerRepo = new InMemoryGenericRepo<ServiceProviderEntity>();
        var broker = new TestMessageBroker();
        var emailService = new TrackingEmailService();

        var domainService = new UserDomainService(userRepo, customerRepo, providerRepo, broker, emailService);

        // Act
        var result = await domainService.RegisterUserAsync("Ana Clara", "anaclara@workez.com", UserRole.Customer, "(11) 99999-8888");

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("anaclara@workez.com", result.Value.Email);
        Assert.Equal(1, emailService.WelcomeUserCalls);
        Assert.Single(broker.DispatchedEvents);
        Assert.IsType<UserRegisteredEvent>(broker.DispatchedEvents[0]);
    }

    [Fact]
    public async Task PaymentDomainService_ProcessPaymentCompleted_ShouldTriggerReceiptEmails()
    {
        // Arrange
        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente Pagador", Email = "pagador@teste.com" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };
        var service = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, Customer = customer, Title = "Limpeza Pós-Obra", ServiceStatus = ServiceStatus.WaitingPayment };

        var serviceRepo = new InMemoryServiceRepo([service]);
        var broker = new TestMessageBroker();
        var emailService = new TrackingEmailService();

        var domainService = new PaymentDomainService(serviceRepo, broker, emailService);

        // Act
        var result = await domainService.ProcessPaymentCompletedAsync(service.Id, 450.00m, "Cartão de Crédito", "TX-12345");

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(ServiceStatus.InProgress, service.ServiceStatus);
        Assert.Equal(1, emailService.PaymentCompletedCalls);
        Assert.Single(broker.DispatchedEvents);
        Assert.IsType<PaymentCompletedEvent>(broker.DispatchedEvents[0]);
    }

    private class TrackingEmailService : IEmailService
    {
        public int OrderStatusUpdatedCalls { get; private set; }
        public int ProviderAcceptedCalls { get; private set; }
        public int PaymentCompletedCalls { get; private set; }
        public int WelcomeUserCalls { get; private set; }

        public Task SendEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task SendProposalNotificationAsync(string clientEmail, string clientName, string providerName, string serviceTitle, decimal proposedPrice, string? description, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task SendProposalAcceptedNotificationAsync(string providerEmail, string providerName, string clientName, string serviceTitle, decimal agreedPrice, string confirmationCode, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task SendProposalRejectedNotificationAsync(string providerEmail, string providerName, string serviceTitle, string? reason, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task SendOrderStatusUpdatedNotificationAsync(string recipientEmail, string recipientName, string serviceTitle, string oldStatus, string newStatus, string? observations = null, CancellationToken cancellationToken = default)
        {
            OrderStatusUpdatedCalls++;
            return Task.CompletedTask;
        }

        public Task SendProviderAcceptedNotificationAsync(string clientEmail, string clientName, string providerName, string serviceTitle, decimal agreedPrice, DateTime? scheduledDate, CancellationToken cancellationToken = default)
        {
            ProviderAcceptedCalls++;
            return Task.CompletedTask;
        }

        public Task SendPaymentCompletedNotificationAsync(string recipientEmail, string recipientName, string serviceTitle, decimal amount, string paymentMethod, string transactionId, CancellationToken cancellationToken = default)
        {
            PaymentCompletedCalls++;
            return Task.CompletedTask;
        }

        public Task SendWelcomeNotificationAsync(string userEmail, string userName, string userRole, CancellationToken cancellationToken = default)
        {
            WelcomeUserCalls++;
            return Task.CompletedTask;
        }
    }

    private class TestMessageBroker : IBaseMessageBroker
    {
        public List<IDomainEvent> DispatchedEvents { get; } = [];
        public Task PublishAsync<TEvent>(TEvent domainEvent, CancellationToken cancellationToken = default) where TEvent : class, IDomainEvent
        {
            DispatchedEvents.Add(domainEvent);
            return Task.CompletedTask;
        }
    }

    private class InMemoryGenericRepo<T> : IBaseRepository<T> where T : BaseEntity
    {
        public List<T> Items { get; } = [];
        public Task<T?> GetByIdAsync(Guid id) => Task.FromResult(Items.FirstOrDefault(i => i.Id == id));
        public Task<IEnumerable<T>> GetAllAsync() => Task.FromResult<IEnumerable<T>>(Items);
        public Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate) => Task.FromResult(Items.AsQueryable().Where(predicate).AsEnumerable());
        public Task AddAsync(T entity) { Items.Add(entity); return Task.CompletedTask; }
        public void Update(T entity) { }
        public void Remove(T entity) => Items.Remove(entity);
        public Task<int> SaveChangesAsync() => Task.FromResult(1);
    }

    private class InMemoryServiceRepo : InMemoryGenericRepo<Service>, IServiceRepository
    {
        public InMemoryServiceRepo(IEnumerable<Service>? initial = null)
        {
            if (initial != null) Items.AddRange(initial);
        }

        public Task<Service?> GetByIdWithDetailsAsync(Guid id) => Task.FromResult(Items.FirstOrDefault(s => s.Id == id));
        public Task<IEnumerable<Service>> GetServicesByCustomerAsync(Guid customerId) => Task.FromResult(Items.Where(s => s.CustomerId == customerId));
    }

    private class InMemoryAppointmentRepo : InMemoryGenericRepo<Appointment>, IAppointmentRepository
    {
        public Task<Appointment?> GetByServiceIdAsync(Guid serviceId) => Task.FromResult(Items.FirstOrDefault(a => a.ServiceId == serviceId));
    }
}
