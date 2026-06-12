using FluentValidation;
using WorkEz.Api.Validators;

namespace WorkEz.Api.Extensions;

public static class FluentValidationExtensions
{
    /// <summary>
    /// Register all validators from the Validators namespace automatically.
    /// </summary>
    public static IServiceCollection AddFluentValidation(this IServiceCollection services)
    {
        services.AddValidatorsFromAssemblyContaining<CreateUserDtoValidator>();
        return services;
    }
}
