using System.Net.Mail;
using WorkEz.Application.DTOs;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Interfaces;
using ServiceProviderEntity = WorkEz.Domain.Entities.ServiceProvider;

namespace WorkEz.Application.Services;

public interface IAuthApplicationService
{
    Task<Result<RegisterResponse>> RegisterCustomerAsync(RegisterCustomerRequest request);
    Task<Result<RegisterResponse>> RegisterProviderAsync(RegisterProviderRequest request);
    Task<Result<TokenResponse>> LoginAsync(LoginRequest request);
    Task<Result<TokenResponse>> RefreshAsync(RefreshRequest request);
    Task<Result<bool>> LogoutAsync(RefreshRequest request);
}

public class AuthApplicationService(
    IUserRepository userRepository,
    IBaseRepository<Customer> customerRepository,
    IBaseRepository<ServiceProviderEntity> providerRepository,
    IRefreshTokenRepository refreshTokenRepository,
    ITokenService tokenService,
    IPasswordHasher passwordHasher,
    IEmailService? emailService = null
) : IAuthApplicationService
{
    private const int MinPasswordLength = 6;
    private readonly IUserRepository _userRepository = userRepository;
    private readonly IBaseRepository<Customer> _customerRepository = customerRepository;
    private readonly IBaseRepository<ServiceProviderEntity> _providerRepository = providerRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository = refreshTokenRepository;
    private readonly ITokenService _tokenService = tokenService;
    private readonly IPasswordHasher _passwordHasher = passwordHasher;
    private readonly IEmailService? _emailService = emailService;

    private async Task SendWelcomeEmailAsync(User user)
    {
        if (_emailService == null) return;
        await _emailService.SendWelcomeNotificationAsync(user.Email, user.Name, user.Role.ToString());
    }

    public async Task<Result<RegisterResponse>> RegisterCustomerAsync(RegisterCustomerRequest request)
    {
        var validation = await ValidateRegistrationAsync(request.Name, request.Email, request.Password);
        if (!validation.IsSuccess)
            return Result<RegisterResponse>.Failure(validation.Error!, validation.ErrorCode!);

        var user = NewUser(request.Name!, request.Email!, request.Password!, request.Phone, null, UserRole.Customer);
        await _userRepository.AddAsync(user);
        await _customerRepository.AddAsync(new Customer { UserId = user.Id });
        await _userRepository.SaveChangesAsync();
        await SendWelcomeEmailAsync(user);

        return Result<RegisterResponse>.Success(new RegisterResponse(user.Id, user.Name, user.Email, user.Role.ToString()));
    }

    public async Task<Result<RegisterResponse>> RegisterProviderAsync(RegisterProviderRequest request)
    {
        var validation = await ValidateRegistrationAsync(request.Name, request.Email, request.Password);
        if (!validation.IsSuccess)
            return Result<RegisterResponse>.Failure(validation.Error!, validation.ErrorCode!);

        var user = NewUser(request.Name!, request.Email!, request.Password!, request.Phone, request.DocumentNumber, UserRole.ServiceProvider);
        await _userRepository.AddAsync(user);
        await _providerRepository.AddAsync(new ServiceProviderEntity { UserId = user.Id });
        await _userRepository.SaveChangesAsync();
        await SendWelcomeEmailAsync(user);

        return Result<RegisterResponse>.Success(new RegisterResponse(user.Id, user.Name, user.Email, user.Role.ToString()));
    }

    public async Task<Result<TokenResponse>> LoginAsync(LoginRequest request)
    {
        var email = NormalizeEmail(request.Email);
        var user = string.IsNullOrEmpty(email) ? null : await _userRepository.GetByEmailAsync(email);

        if (user is null || string.IsNullOrEmpty(request.Password) || string.IsNullOrEmpty(user.PasswordHash))
            return Result<TokenResponse>.Failure("E-mail ou senha inválidos.", "BAD_REQUEST");

        if (!_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
            return Result<TokenResponse>.Failure("E-mail ou senha inválidos.", "BAD_REQUEST");

        var response = await IssueTokensAsync(user);
        return Result<TokenResponse>.Success(response);
    }

    public async Task<Result<TokenResponse>> RefreshAsync(RefreshRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return Result<TokenResponse>.Failure("Refresh token inválido.", "UNAUTHORIZED");

        var stored = await _refreshTokenRepository.GetByTokenWithUserAsync(request.RefreshToken);
        if (stored is null || !stored.IsActive)
            return Result<TokenResponse>.Failure("Refresh token inválido ou expirado.", "UNAUTHORIZED");

        stored.IsRevoked = true;
        stored.Touch();
        _refreshTokenRepository.Update(stored);

        var response = await IssueTokensAsync(stored.User);
        return Result<TokenResponse>.Success(response);
    }

    public async Task<Result<bool>> LogoutAsync(RefreshRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            var stored = await _refreshTokenRepository.GetByTokenAsync(request.RefreshToken);
            if (stored is { IsRevoked: false })
            {
                stored.IsRevoked = true;
                stored.Touch();
                _refreshTokenRepository.Update(stored);
                await _refreshTokenRepository.SaveChangesAsync();
            }
        }
        return Result<bool>.Success(true);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private async Task<TokenResponse> IssueTokensAsync(User user)
    {
        var refreshToken = _tokenService.GenerateRefreshToken();
        await _refreshTokenRepository.AddAsync(new RefreshToken
        {
            UserId = user.Id,
            Token = refreshToken,
            ExpiresAt = _tokenService.RefreshTokenExpiresAt,
        });
        await _refreshTokenRepository.SaveChangesAsync();

        return new TokenResponse(
            _tokenService.CreateAccessToken(user),
            refreshToken,
            _tokenService.AccessTokenLifetimeSeconds
        );
    }

    private User NewUser(string name, string email, string password, string? phone, string? documentNumber, UserRole role) => new()
    {
        Name = name.Trim(),
        Email = NormalizeEmail(email)!,
        PasswordHash = _passwordHasher.HashPassword(password),
        Phone = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim(),
        DocumentNumber = string.IsNullOrWhiteSpace(documentNumber) ? null : new string(documentNumber.Where(char.IsDigit).ToArray()),
        Role = role,
    };

    private async Task<Result<bool>> ValidateRegistrationAsync(string? name, string? email, string? password)
    {
        if (string.IsNullOrWhiteSpace(name))
            return Result<bool>.Failure("Nome é obrigatório.", "BAD_REQUEST");

        var normalized = NormalizeEmail(email);
        if (normalized is null || !IsValidEmail(normalized))
            return Result<bool>.Failure("E-mail inválido.", "BAD_REQUEST");

        if (string.IsNullOrEmpty(password) || password.Length < MinPasswordLength)
            return Result<bool>.Failure($"A senha deve ter pelo menos {MinPasswordLength} caracteres.", "BAD_REQUEST");

        var existingUser = await _userRepository.GetByEmailAsync(normalized);
        if (existingUser != null)
            return Result<bool>.Failure("Já existe uma conta com este e-mail.", "CONFLICT");

        return Result<bool>.Success(true);
    }

    private static string? NormalizeEmail(string? email) =>
        string.IsNullOrWhiteSpace(email) ? null : email.Trim().ToLowerInvariant();

    private static bool IsValidEmail(string email) =>
        MailAddress.TryCreate(email, out var parsed) && parsed.Address == email;
}
