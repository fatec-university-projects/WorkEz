using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using WorkEz.Application.Services;
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

        services.AddScoped<IProposalDomainService, ProposalDomainService>();
        services.AddScoped<IProposalApplicationService, ProposalApplicationService>();

        services.AddScoped<IServiceDomainService, ServiceDomainService>();
        services.AddScoped<IServiceApplicationService, ServiceApplicationService>();

        services.AddScoped<IUserDomainService, UserDomainService>();
        services.AddScoped<IUserApplicationService, UserApplicationService>();

        services.AddScoped<IPaymentDomainService, PaymentDomainService>();
        services.AddScoped<IPaymentApplicationService, PaymentApplicationService>();

        return services;
    }
}
