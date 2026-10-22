using Microsoft.AspNetCore.Mvc;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.WebUID.Auth;

namespace WorkEz.WebUID.Controllers;

/// <summary>
/// Controlador de gerenciamento de dados do usuário (perfil, dados de contato e foto).
/// Consumido por WorkEzApp/app/client/edit-profile.tsx e provider/edit-profile.tsx.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class UsersController(IUserApplicationService userService, IWebHostEnvironment env) : ControllerBase
{
    private readonly IUserApplicationService _userService = userService;
    private readonly IWebHostEnvironment _env = env;

    /// <summary>
    /// Retorna o perfil do usuário logado (via token JWT) ou por ID.
    /// </summary>
    [HttpGet("profile")]
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProfile()
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized(new { message = "Usuário não autenticado." });

        var result = await _userService.GetProfileAsync(userId.Value);
        if (!result.IsSuccess)
            return NotFound(new { message = result.Error });

        return Ok(result.Value);
    }

    /// <summary>
    /// Atualiza os dados de perfil do usuário (nome, e-mail, telefone, foto de perfil).
    /// </summary>
    [HttpPut("profile")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateUserProfileRequest request)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized(new { message = "Usuário não autenticado." });

        var result = await _userService.UpdateProfileAsync(
            userId.Value,
            request,
            Request.Scheme,
            Request.Host.Value,
            _env.WebRootPath
        );

        if (!result.IsSuccess)
        {
            return result.ErrorCode switch
            {
                "NOT_FOUND" => NotFound(new { message = result.Error }),
                _ => BadRequest(new { message = result.Error })
            };
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Retorna dados do usuário por Id. Dados de contato (e-mail/telefone) só vêm para o próprio usuário
    /// (ou Admin); para os demais, apenas nome e foto.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var callerUserId = User.GetUserId();
        var result = await _userService.GetByIdAsync(id, callerUserId, User.IsAdmin());
        if (!result.IsSuccess)
            return NotFound(new { message = result.Error });

        return Ok(result.Value);
    }
}
