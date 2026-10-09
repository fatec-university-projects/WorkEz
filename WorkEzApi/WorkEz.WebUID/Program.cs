using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using WorkEz.Infra.Ioc;
using WorkEz.WebUID.Auth;
using WorkEz.WebUID.WebSockets;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
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
    });
builder.Services.AddAuthorization();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseWebSockets(new WebSocketOptions
{
    KeepAliveInterval = TimeSpan.FromSeconds(30)
});

app.Use(async (context, next) =>
{
    if (context.Request.Path == "/ws/tracking" && context.WebSockets.IsWebSocketRequest)
    {
        if (Guid.TryParse(context.Request.Query["serviceId"], out var serviceId))
        {
            var wsManager = context.RequestServices.GetRequiredService<TrackingWebSocketManager>();
            using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
            await wsManager.HandleWebSocketAsync(serviceId, webSocket);
            return;
        }
        else
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }
    }

    if (context.Request.Path == "/ws/chat" && context.WebSockets.IsWebSocketRequest)
    {
        Guid? proposalId = Guid.TryParse(context.Request.Query["proposalId"], out var pId) ? pId : null;
        Guid? serviceId = Guid.TryParse(context.Request.Query["serviceId"], out var sId) ? sId : null;

        if (proposalId.HasValue || serviceId.HasValue)
        {
            var chatWsManager = context.RequestServices.GetRequiredService<ChatWebSocketManager>();
            using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
            await chatWsManager.HandleWebSocketAsync(proposalId, serviceId, webSocket);
            return;
        }
        else
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }
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
