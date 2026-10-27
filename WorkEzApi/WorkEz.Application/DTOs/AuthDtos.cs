namespace WorkEz.Application.DTOs;

public record LoginRequest(string? Email, string? Password);
public record RegisterCustomerRequest(string? Name, string? Email, string? Password, string? Phone, string? DocumentNumber = null, bool DocumentVerified = false);
public record RegisterProviderRequest(string? Name, string? Email, string? Password, string? Phone, string? DocumentNumber, bool DocumentVerified = false);
public record RefreshRequest(string? RefreshToken);
public record TokenResponse(string AccessToken, string RefreshToken, int ExpiresIn, string TokenType = "Bearer");
public record RegisterResponse(Guid Id, string Name, string Email, string Role, bool DocumentVerified = false);
public record ResetPasswordByEmailRequest(string? Email);
public record ResetPasswordResponse(string Email, string DefaultPassword, string Message);
