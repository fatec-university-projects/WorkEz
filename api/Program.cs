using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using WorkEz.Api.Data;
using WorkEz.Api.Extensions;
using WorkEz.Api.Services;
using Microsoft.EntityFrameworkCore;
using WorkEz.Api.Entities;
using WorkEz.Api.Enums;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGenWithAuthSupport(builder.Configuration);


builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));


builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
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
builder.Services.AddScoped<IPaymentService, AbacatePayService>();

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
        {
            await db.Database.MigrateAsync();
        }

        // Programmatic self-healing image column additions
        using (var alterCmd = connection.CreateCommand())
        {
            alterCmd.CommandText = @"
                ALTER TABLE ""Services"" ADD COLUMN IF NOT EXISTS ""ImageUrl"" VARCHAR(1000) NULL;
            ";
            await alterCmd.ExecuteNonQueryAsync();
        }

        // Programmatic category seeding
        if (!await db.Categories.AnyAsync())
        {
            db.Categories.AddRange(
                new Category { Id = Guid.Parse("11111111-1111-1111-1111-111111111111"), Name = "Encanador", Description = "Reparos e instalações hidráulicas", Status = CategoryStatus.Active },
                new Category { Id = Guid.Parse("22222222-2222-2222-2222-222222222222"), Name = "Eletricista", Description = "Instalações e manutenções elétricas", Status = CategoryStatus.Active },
                new Category { Id = Guid.Parse("33333333-3333-3333-3333-333333333333"), Name = "Diarista", Description = "Limpeza residencial e comercial", Status = CategoryStatus.Active },
                new Category { Id = Guid.Parse("44444444-4444-4444-4444-444444444444"), Name = "Pintor", Description = "Pintura de paredes, tetos e portões", Status = CategoryStatus.Active },
                new Category { Id = Guid.Parse("55555555-5555-5555-5555-555555555555"), Name = "Montador", Description = "Montagem de móveis e decorações", Status = CategoryStatus.Active },
                new Category { Id = Guid.Parse("66666666-6666-6666-6666-666666666666"), Name = "Técnico geral", Description = "Assistência técnica de aparelhos", Status = CategoryStatus.Active }
            );
            await db.SaveChangesAsync();
        }
    }
    else
    {
        await db.Database.MigrateAsync();
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
