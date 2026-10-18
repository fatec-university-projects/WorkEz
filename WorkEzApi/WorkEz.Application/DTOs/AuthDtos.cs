namespace WorkEz.Application.DTOs;

public record LoginRequest(string? Email, string? Password);
public record RegisterCustomerRequest(string? Name, string? Email, string? Password, string? Phone);
public record RegisterProviderRequest(string? Name, string? Email, string? Password, string? Phone, string? DocumentNumber);
public record RefreshRequest(string? RefreshToken);
public record TokenResponse(string AccessToken, string RefreshToken, int ExpiresIn, string TokenType = "Bearer");
public record RegisterResponse(Guid Id, string Name, string Email, string Role);
