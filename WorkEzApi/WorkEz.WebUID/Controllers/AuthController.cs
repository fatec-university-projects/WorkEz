using System.Net.Mail;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Infra.Data.Context;
using WorkEz.WebUID.Auth;
using ServiceProviderEntity = WorkEz.Domain.Entities.ServiceProvider;

namespace WorkEz.WebUID.Controllers;

public record LoginRequest(string? Email, string? Password);
public record RegisterCustomerRequest(string? Name, string? Email, string? Password, string? Phone);
public record RegisterProviderRequest(string? Name, string? Email, string? Password, string? Phone, string? DocumentNumber);
public record RefreshRequest(string? RefreshToken);
public record TokenResponse(string AccessToken, string RefreshToken, int ExpiresIn, string TokenType = "Bearer");
public record RegisterResponse(Guid Id, string Name, string Email, string Role);

/// <summary>
/// Autenticação: registro, login, refresh (com rotação) e logout (revogação).
/// Contrato consumido por WorkEzApp/services/authService.ts e api.ts.
/// </summary>
[ApiController]
[AllowAnonymous] // login, cadastro e refresh são públicos por natureza
[Route("api/[controller]")]
public class AuthController(AppDbContext db, TokenService tokens) : ControllerBase
{
    private const int MinPasswordLength = 6;

    [HttpPost("register/customer")]
    [ProducesResponseType(typeof(RegisterResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> RegisterCustomer([FromBody] RegisterCustomerRequest request)
    {
        var error = await ValidateRegistrationAsync(request.Name, request.Email, request.Password);
        if (error is not null) return error;

        var user = NewUser(request.Name!, request.Email!, request.Password!, request.Phone, null, UserRole.Customer);
        db.Users.Add(user);
        db.Customers.Add(new Customer { UserId = user.Id });
        await db.SaveChangesAsync();

        return Created(string.Empty, new RegisterResponse(user.Id, user.Name, user.Email, user.Role.ToString()));
    }

    [HttpPost("register/provider")]
    [ProducesResponseType(typeof(RegisterResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> RegisterProvider([FromBody] RegisterProviderRequest request)
    {
        var error = await ValidateRegistrationAsync(request.Name, request.Email, request.Password);
        if (error is not null) return error;

        var user = NewUser(request.Name!, request.Email!, request.Password!, request.Phone, request.DocumentNumber, UserRole.ServiceProvider);
        db.Users.Add(user);
        db.Providers.Add(new ServiceProviderEntity { UserId = user.Id });
        await db.SaveChangesAsync();

        return Created(string.Empty, new RegisterResponse(user.Id, user.Name, user.Email, user.Role.ToString()));
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(TokenResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var email = NormalizeEmail(request.Email);
        var user = string.IsNullOrEmpty(email) ? null : await db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null || string.IsNullOrEmpty(request.Password) || string.IsNullOrEmpty(user.PasswordHash))
            return BadRequest(new { message = "E-mail ou senha inválidos." });

        bool passwordValid = false;
        try
        {
            passwordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
        }
        catch
        {
            passwordValid = false;
        }

        if (!passwordValid)
            return BadRequest(new { message = "E-mail ou senha inválidos." });

        return Ok(await IssueTokensAsync(user));
    }

    /// <summary>Troca um refresh token válido por um novo par de tokens (o antigo é revogado).</summary>
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(TokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return Unauthorized(new { message = "Refresh token inválido." });

        var stored = await db.RefreshTokens.Include(t => t.User).FirstOrDefaultAsync(t => t.Token == request.RefreshToken);

        if (stored is null || !stored.IsActive)
            return Unauthorized(new { message = "Refresh token inválido ou expirado." });

        stored.IsRevoked = true;
        stored.Touch();
        return Ok(await IssueTokensAsync(stored.User));
    }

    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.Token == request.RefreshToken);
            if (stored is { IsRevoked: false })
            {
                stored.IsRevoked = true;
                stored.Touch();
                await db.SaveChangesAsync();
            }
        }
        return NoContent();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private async Task<TokenResponse> IssueTokensAsync(User user)
    {
        var refreshToken = TokenService.GenerateRefreshToken();
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            Token = refreshToken,
            ExpiresAt = tokens.RefreshTokenExpiresAt,
        });
        await db.SaveChangesAsync();

        return new TokenResponse(tokens.CreateAccessToken(user), refreshToken, tokens.AccessTokenLifetimeSeconds);
    }

    private static User NewUser(string name, string email, string password, string? phone, string? documentNumber, UserRole role) => new()
    {
        Name = name.Trim(),
        Email = NormalizeEmail(email)!,
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
        Phone = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim(),
        DocumentNumber = string.IsNullOrWhiteSpace(documentNumber) ? null : new string(documentNumber.Where(char.IsDigit).ToArray()),
        Role = role,
    };

    private async Task<IActionResult?> ValidateRegistrationAsync(string? name, string? email, string? password)
    {
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new { message = "Nome é obrigatório." });

        var normalized = NormalizeEmail(email);
        if (normalized is null || !IsValidEmail(normalized))
            return BadRequest(new { message = "E-mail inválido." });

        if (string.IsNullOrEmpty(password) || password.Length < MinPasswordLength)
            return BadRequest(new { message = $"A senha deve ter pelo menos {MinPasswordLength} caracteres." });

        if (await db.Users.AnyAsync(u => u.Email == normalized))
            return Conflict(new { message = "Já existe uma conta com este e-mail." });

        return null;
    }

    private static string? NormalizeEmail(string? email) =>
        string.IsNullOrWhiteSpace(email) ? null : email.Trim().ToLowerInvariant();

    private static bool IsValidEmail(string email) =>
        MailAddress.TryCreate(email, out var parsed) && parsed.Address == email;
}
