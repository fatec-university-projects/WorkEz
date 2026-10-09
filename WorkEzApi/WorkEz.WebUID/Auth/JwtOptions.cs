namespace WorkEz.WebUID.Auth;

/// <summary>Configurações do JWT (seção "Jwt" / variáveis Jwt__*).</summary>
public class JwtOptions
{
    public string Issuer { get; set; } = "WorkEz";
    public string Audience { get; set; } = "WorkEzClient";
    public string SecretKey { get; set; } = string.Empty;
    public int AccessTokenExpirationMinutes { get; set; } = 15;
    public int RefreshTokenExpirationDays { get; set; } = 7;
}
