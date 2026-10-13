using Microsoft.AspNetCore.Mvc;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;

namespace WorkEz.WebUID.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController(IUserApplicationService userApplicationService) : ControllerBase
{
    private readonly IUserApplicationService _userApplicationService = userApplicationService;

    /// <summary>
    /// Cadastra um novo usuário na plataforma e dispara e-mail temático de boas-vindas.
    /// </summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterUserRequest request)
    {
        var result = await _userApplicationService.RegisterUserAsync(request);
        if (result.IsFailure)
        {
            return BadRequest(new { error = result.Error, code = result.ErrorCode });
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await _userApplicationService.GetUserByIdAsync(id);
        if (user is null)
        {
            return NotFound(new { error = "Usuário não encontrado." });
        }

        return Ok(user);
    }

    [HttpGet("by-email")]
    public async Task<IActionResult> GetByEmail([FromQuery] string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return BadRequest(new { error = "O parâmetro e-mail é obrigatório." });
        }

        var user = await _userApplicationService.GetUserByEmailAsync(email);
        if (user is null)
        {
            return NotFound(new { error = "Usuário não encontrado com este e-mail." });
        }

        return Ok(user);
    }
}
