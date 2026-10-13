using System.Text.Json.Serialization;
using WorkEz.Infra.Ioc;

var builder = WebApplication.CreateBuilder(args);

// Injeção de dependência da Clean Architecture (Domínio, Infraestrutura, Aplicação, E-mails e Eventos)
builder.Services.AddInfrastructure(builder.Configuration);

// Configuração de Controllers e Views MVC com suporte a Enums serializados como String
builder.Services.AddControllersWithViews()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// Configuração de CORS permissivo para emuladores e frontends web (Vercel / Expo Web)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

// Habilita Swagger para exploração interativa das rotas
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseCors("AllowAll");

app.UseRouting();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.MapControllers();

app.Run();
