using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using WorkEz.Application.Services;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Interfaces;
using WorkEz.Domain.Services;
using WorkEz.Infra.Data.Context;
using WorkEz.Infra.Data.MessageBroker;
using WorkEz.Infra.Data.Repositories;
using WorkEz.Infra.Data.Services;

namespace WorkEz.Infra.Ioc;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (!string.IsNullOrEmpty(connectionString))
        {
            services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
        }
        else
        {
            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase("WorkEzDb"));
        }

        services.AddSingleton<IBaseMessageBroker, BaseMessageBroker>();
        services.AddScoped<IEmailService, SmtpEmailService>();

        services.AddScoped(typeof(IBaseRepository<>), typeof(BaseRepository<>));
        services.AddScoped<IProposalRepository, ProposalRepository>();
        services.AddScoped<IServiceRepository, ServiceRepository>();
        services.AddScoped<IAppointmentRepository, AppointmentRepository>();
        services.AddScoped<IServiceProviderRepository, ServiceProviderRepository>();
        services.AddScoped<IChatMessageRepository, ChatMessageRepository>();
        services.AddScoped<IUserDeviceTokenRepository, UserDeviceTokenRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<ICustomerRepository, CustomerRepository>();
        services.AddScoped<IReviewRepository, ReviewRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IWalletTransactionRepository, WalletTransactionRepository>();
        services.AddScoped<IWithdrawalRequestRepository, WithdrawalRequestRepository>();
        services.AddSingleton<IPasswordHasher, PasswordHasher>();

        services.AddHttpClient<IPushNotificationService, PushNotificationService>();
        services.AddHttpClient<IDelFinanceClient, DelFinanceClient>((client, sp) =>
        {
            var config = sp.GetRequiredService<IConfiguration>();
            var logger = sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<DelFinanceClient>>();
            var settings = new WorkEz.Application.DTOs.DelFinanceSettings
            {
                BaseUrl = config["DelFinance:BaseUrl"] ?? "https://apisandbox.delbank.com.br",
                ApiKey = config["DelFinance:ApiKey"] ?? string.Empty,
                AccountId = config["DelFinance:AccountId"] ?? "31712",
                WebhookSecret = config["DelFinance:WebhookSecret"] ?? string.Empty
            };
            return new DelFinanceClient(client, logger, settings);
        });

        services.AddScoped<IProposalDomainService, ProposalDomainService>();
        services.AddScoped<IProposalApplicationService, ProposalApplicationService>();
        services.AddScoped<IPortfolioApplicationService, PortfolioApplicationService>();
        services.AddScoped<IChatApplicationService, ChatApplicationService>();
        services.AddScoped<IServiceOpportunityApplicationService, ServiceOpportunityApplicationService>();
        services.AddScoped<IServiceApplicationService, ServiceApplicationService>();
        services.AddScoped<ICategoryApplicationService, CategoryApplicationService>();
        services.AddScoped<ICustomerApplicationService, CustomerApplicationService>();
        services.AddScoped<IReviewApplicationService, ReviewApplicationService>();
        services.AddScoped<IUserApplicationService, UserApplicationService>();
        services.AddScoped<IAuthApplicationService, AuthApplicationService>();
        services.AddScoped<IWalletApplicationService, WalletApplicationService>();

        return services;
    }
}
