using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using WorkEz.Domain.Entities;

namespace WorkEz.WebUID.Auth;

/// <summary>Gera access tokens JWT e refresh tokens opacos.</summary>
public class TokenService(IOptions<JwtOptions> options)
{
    private readonly JwtOptions _options = options.Value;

    public int AccessTokenLifetimeSeconds => _options.AccessTokenExpirationMinutes * 60;
    public DateTime RefreshTokenExpiresAt => DateTime.UtcNow.AddDays(_options.RefreshTokenExpirationDays);

    /// <summary>
    /// Claims emitidas com nomes curtos (sub, name, email, role) — é o formato lido pelo app
    /// em authService.decodeJwt. O role é o nome do enum: Customer | ServiceProvider | Admin.
    /// </summary>
    public string CreateAccessToken(User user)
    {
        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(
            [
                new Claim("sub", user.Id.ToString()),
                new Claim("name", user.Name),
                new Claim("email", user.Email),
                new Claim("role", user.Role.ToString()),
            ]),
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            Expires = DateTime.UtcNow.AddSeconds(AccessTokenLifetimeSeconds),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SecretKey)),
                SecurityAlgorithms.HmacSha256),
        };

        return new JsonWebTokenHandler().CreateToken(descriptor);
    }

    public static string GenerateRefreshToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    /// <summary>Refresh tokens só são persistidos como hash SHA-256.</summary>
    public static string Hash(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
