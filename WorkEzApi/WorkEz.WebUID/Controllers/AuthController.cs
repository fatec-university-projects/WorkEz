using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;

namespace WorkEz.WebUID.Controllers;

/// <summary>
/// Autenticação: registro, login, refresh (com rotação) e logout (revogação).
/// Contrato consumido por WorkEzApp/services/authService.ts e api.ts.
/// </summary>
[ApiController]
[AllowAnonymous] // login, cadastro e refresh são públicos por natureza
[Route("api/[controller]")]
public class AuthController(IAuthApplicationService authService) : ControllerBase
{
    private readonly IAuthApplicationService _authService = authService;

    [HttpPost("register/customer")]
    [ProducesResponseType(typeof(RegisterResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RegisterCustomer([FromBody] RegisterCustomerRequest request)
    {
        var result = await _authService.RegisterCustomerAsync(request);
        if (!result.IsSuccess)
        {
            return result.ErrorCode == "CONFLICT"
                ? Conflict(new { message = result.Error })
                : BadRequest(new { message = result.Error });
        }

        return Created(string.Empty, result.Value);
    }

    [HttpPost("register/provider")]
    [ProducesResponseType(typeof(RegisterResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RegisterProvider([FromBody] RegisterProviderRequest request)
    {
        var result = await _authService.RegisterProviderAsync(request);
        if (!result.IsSuccess)
        {
            return result.ErrorCode == "CONFLICT"
                ? Conflict(new { message = result.Error })
                : BadRequest(new { message = result.Error });
        }

        return Created(string.Empty, result.Value);
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(TokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        if (!result.IsSuccess)
            return BadRequest(new { message = result.Error });

        return Ok(result.Value);
    }

    /// <summary>Troca um refresh token válido por um novo par de tokens (o antigo é revogado).</summary>
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(TokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
    {
        var result = await _authService.RefreshAsync(request);
        if (!result.IsSuccess)
            return Unauthorized(new { message = result.Error });

        return Ok(result.Value);
    }

    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest request)
    {
        await _authService.LogoutAsync(request);
        return NoContent();
    }
}
