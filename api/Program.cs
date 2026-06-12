using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using WorkEz.Api.Data;
using WorkEz.Api.Extensions;
using WorkEz.Api.Services;
using WorkEz.Api.Middleware;
using Microsoft.EntityFrameworkCore;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGenWithAuthSupport(builder.Configuration);

// Add FluentValidation
builder.Services.AddFluentValidation();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));


builder.Services.AddCors(options =>
{
    var isDevelopment = builder.Environment.IsDevelopment();

    if (isDevelopment)
    {
        // Development: Allow all origins
        options.AddPolicy("AllowAll", policy =>
            policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
    }
    else
    {
        // Production: Restrict to specific origins
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
            ?? new[] { "https://app.workez.com.br" };

        options.AddPolicy("AllowAll", policy =>
            policy.WithOrigins(allowedOrigins)
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials());
    }
});


builder.Services
    .AddControllers(options =>
    {
        options.Filters.Add(new Microsoft.AspNetCore.Mvc.Authorization.AuthorizeFilter());
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler     = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });


builder.Services.AddSingleton<IPasswordHasherService, PasswordHasherService>();
builder.Services.AddSingleton<ITokenService, TokenService>();

builder.Services.AddScoped<IUserService, UserService>();

// AbacatePay payment gateway – typed HttpClient
builder.Services.AddHttpClient<IPaymentService, AbacatePayService>();


// Domain services
builder.Services.AddScoped<IAddressService, AddressService>();
builder.Services.AddScoped<IAdministratorService, AdministratorService>();
builder.Services.AddScoped<IAppointmentService, AppointmentService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IConversationService, ConversationService>();
builder.Services.AddScoped<ICustomerService, CustomerService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IProposalService, ProposalService>();
builder.Services.AddScoped<IProviderCategoryService, ProviderCategoryService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IReviewService, ReviewService>();
builder.Services.AddScoped<IServiceAreaService, ServiceAreaService>();
builder.Services.AddScoped<IServiceProviderService, ServiceProviderService>();
builder.Services.AddScoped<IServiceService, ServiceService>();


var jwtSection = builder.Configuration.GetSection("Jwt");
var secretKey  = jwtSection["SecretKey"]
    ?? throw new InvalidOperationException("Jwt:SecretKey is missing from configuration.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidIssuer              = jwtSection["Issuer"] ?? "WorkEz",
            ValidateAudience         = true,
            ValidAudience            = jwtSection["Audience"] ?? "WorkEzClient",
            ValidateLifetime         = true,
            ClockSkew                = TimeSpan.Zero,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            NameClaimType            = "name",
            // Must match the claim type used when emitting the token in TokenService
            RoleClaimType            = System.Security.Claims.ClaimTypes.Role
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly",           policy => policy.RequireRole("Admin"));
    options.AddPolicy("CustomerOnly",         policy => policy.RequireRole("Customer"));
    options.AddPolicy("ServiceProviderOnly",  policy => policy.RequireRole("ServiceProvider"));
});

WebApplication app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (await db.Database.CanConnectAsync())
    {
        var connection = db.Database.GetDbConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'public' AND TABLE_TYPE = 'BASE TABLE'";
        var result     = await command.ExecuteScalarAsync();
        var tableCount = Convert.ToInt32(result);

        if (tableCount == 0)
            await db.Database.MigrateAsync();
    }
    else
    {
        await db.Database.MigrateAsync();
    }
}

app.UseSwagger();
app.UseSwaggerUI();

// Global exception handling middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();

// Rate limiting middleware
app.UseRateLimiting();

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }))
    .WithName("Health")
    .AllowAnonymous();

app.Run();
