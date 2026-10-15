using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using WorkEz.Infra.Data.Context;
using WorkEz.Infra.Ioc;
using WorkEz.WebUID.Auth;
using WorkEz.WebUID.WebSockets;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.CustomSchemaIds(type => type.FullName?.Replace("+", ".") ?? type.Name);
});

builder.Services.AddCors(options =>
{
    // A API autentica por header Bearer (sem cookies), então CORS aberto não permite roubo de sessão.
    // Em produção restrinja às origens do app web via Cors__AllowedOrigins__0=https://seu-app
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
    options.AddPolicy("AllowAll", policy =>
    {
        if (allowedOrigins.Length > 0)
            policy.WithOrigins(allowedOrigins).AllowAnyMethod().AllowAnyHeader();
        else
            policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

builder.Services.AddSingleton<TrackingWebSocketManager>();
builder.Services.AddSingleton<ITrackingNotificationService>(sp => sp.GetRequiredService<TrackingWebSocketManager>());

builder.Services.AddSingleton<ChatWebSocketManager>();
builder.Services.AddSingleton<IChatNotificationService>(sp => sp.GetRequiredService<ChatWebSocketManager>());

builder.Services.AddInfrastructure(builder.Configuration);

var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtOptions = jwtSection.Get<JwtOptions>() ?? new JwtOptions();
if (string.IsNullOrWhiteSpace(jwtOptions.SecretKey) || jwtOptions.SecretKey.Length < 32)
    throw new InvalidOperationException("Jwt:SecretKey ausente ou com menos de 32 caracteres. Configure Jwt__SecretKey.");

builder.Services.Configure<JwtOptions>(jwtSection);
builder.Services.AddSingleton<TokenService>();
builder.Services.AddSingleton<WorkEz.Domain.Interfaces.ITokenService>(sp => sp.GetRequiredService<TokenService>());
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SecretKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "name",
            RoleClaimType = "role",
        };

        // WebSockets não conseguem enviar header Authorization no navegador/RN:
        // aceita o JWT em ?access_token= apenas nas rotas /ws.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var token = ctx.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(token) && ctx.HttpContext.Request.Path.StartsWithSegments("/ws"))
                    ctx.Token = token;
                return Task.CompletedTask;
            }
        };
    });

// Seguro por padrão: qualquer endpoint sem [AllowAnonymous] exige usuário autenticado.
builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

// Swagger só em desenvolvimento, ou em produção se Swagger:Enabled=true.
if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseWebSockets(new WebSocketOptions
{
    KeepAliveInterval = TimeSpan.FromSeconds(30)
});

app.Use(async (context, next) =>
{
    var isTracking = context.Request.Path == "/ws/tracking";
    var isChat = context.Request.Path == "/ws/chat";

    if ((isTracking || isChat) && context.WebSockets.IsWebSocketRequest)
    {
        // 1. Autenticação: JWT via ?access_token= (ver JwtBearerEvents.OnMessageReceived).
        var auth = await context.AuthenticateAsync(JwtBearerDefaults.AuthenticationScheme);
        var userId = auth.Principal?.GetUserId();
        if (!auth.Succeeded || userId is null)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        Guid? proposalId = Guid.TryParse(context.Request.Query["proposalId"], out var pId) ? pId : null;
        Guid? serviceId = Guid.TryParse(context.Request.Query["serviceId"], out var sId) ? sId : null;

        if (isTracking ? !serviceId.HasValue : !(proposalId.HasValue || serviceId.HasValue))
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        // 2. Autorização: só participantes do chamado/proposta podem escutar.
        var db = context.RequestServices.GetRequiredService<AppDbContext>();
        var allowed = auth.Principal!.IsAdmin()
            || ((!serviceId.HasValue || await db.IsServiceParticipantAsync(serviceId.Value, userId.Value))
                && (!proposalId.HasValue || await db.IsProposalParticipantAsync(proposalId.Value, userId.Value)));
        if (!allowed)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }

        using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
        if (isTracking)
        {
            var wsManager = context.RequestServices.GetRequiredService<TrackingWebSocketManager>();
            await wsManager.HandleWebSocketAsync(serviceId!.Value, webSocket);
        }
        else
        {
            var chatWsManager = context.RequestServices.GetRequiredService<ChatWebSocketManager>();
            await chatWsManager.HandleWebSocketAsync(proposalId, serviceId, webSocket);
        }
        return;
    }

    await next();
});

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseStaticFiles();
app.UseRouting();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
    .WithName("Health")
    .AllowAnonymous();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.MapControllers();

app.Run();
