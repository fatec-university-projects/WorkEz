using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkEz.Domain.Entities;
using WorkEz.Infra.Data.Context;

namespace WorkEz.WebUID.Controllers;

public record UpdateUserProfileRequest(
    string Name,
    string Email,
    string? Phone,
    string? ProfilePicture
);

public record UserProfileDto(
    Guid Id,
    string Name,
    string Email,
    string? Phone,
    string? ProfilePicture,
    string Role
);

/// <summary>
/// Controlador de gerenciamento de dados do usuário (perfil, dados de contato e foto).
/// Consumido por WorkEzApp/app/client/edit-profile.tsx e provider/edit-profile.tsx.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class UsersController(AppDbContext db, IWebHostEnvironment env) : ControllerBase
{
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
        var sub = User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(sub, out var userId))
            return Unauthorized(new { message = "Usuário não autenticado." });

        var user = await db.Users.FindAsync(userId);
        if (user == null)
            return NotFound(new { message = "Usuário não encontrado." });

        return Ok(new UserProfileDto(
            user.Id,
            user.Name,
            user.Email,
            user.Phone,
            user.ProfilePicture,
            user.Role.ToString()
        ));
    }

    /// <summary>
    /// Atualiza os dados de perfil do usuário (nome, e-mail, telefone, foto de perfil).
    /// </summary>
    [HttpPut("profile")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateUserProfileRequest request)
    {
        User? user = null;

        // 1. Tenta identificar pelo subject do token JWT
        var sub = User.FindFirst("sub")?.Value;
        if (Guid.TryParse(sub, out var userId))
        {
            user = await db.Users.FindAsync(userId);
        }

        // 2. Fallback de segurança: busca pelo e-mail informado
        if (user == null && !string.IsNullOrWhiteSpace(request.Email))
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            user = await db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        }

        if (user == null)
            return NotFound(new { message = "Usuário não encontrado para atualização." });

        if (!string.IsNullOrWhiteSpace(request.Name))
            user.Name = request.Name.Trim();

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var newEmail = request.Email.Trim().ToLowerInvariant();
            if (user.Email != newEmail)
            {
                var emailInUse = await db.Users.AnyAsync(u => u.Email == newEmail && u.Id != user.Id);
                if (emailInUse)
                    return BadRequest(new { message = "Este e-mail já está sendo utilizado por outra conta." });

                user.Email = newEmail;
            }
        }

        user.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        if (request.ProfilePicture != null)
        {
            var pic = request.ProfilePicture.Trim();
            if (pic.StartsWith("data:image/") || pic.Length > 400)
            {
                try
                {
                    var root = env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                    var uploadsFolder = Path.Combine(root, "uploads");
                    if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

                    var ext = ".jpg";
                    var raw = pic;
                    if (raw.StartsWith("data:image/"))
                    {
                        var commaIdx = raw.IndexOf(',');
                        if (commaIdx >= 0)
                        {
                            var header = raw[..commaIdx];
                            if (header.Contains("png")) ext = ".png";
                            else if (header.Contains("webp")) ext = ".webp";
                            raw = raw[(commaIdx + 1)..];
                        }
                    }

                    var bytes = Convert.FromBase64String(raw);
                    var fileName = $"{Guid.NewGuid():N}{ext}";
                    var filePath = Path.Combine(uploadsFolder, fileName);
                    await System.IO.File.WriteAllBytesAsync(filePath, bytes);

                    var baseUrl = $"{Request.Scheme}://{Request.Host}";
                    user.ProfilePicture = $"{baseUrl}/uploads/{fileName}";
                }
                catch
                {
                    // Se falhar o parse do base64, mantém se couber no limite
                    if (pic.Length <= 500) user.ProfilePicture = pic;
                }
            }
            else
            {
                user.ProfilePicture = pic;
            }
        }

        user.Touch();
        await db.SaveChangesAsync();

        return Ok(new UserProfileDto(
            user.Id,
            user.Name,
            user.Email,
            user.Phone,
            user.ProfilePicture,
            user.Role.ToString()
        ));
    }

    /// <summary>
    /// Retorna dados do usuário por Id.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await db.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = "Usuário não encontrado." });

        return Ok(new UserProfileDto(
            user.Id,
            user.Name,
            user.Email,
            user.Phone,
            user.ProfilePicture,
            user.Role.ToString()
        ));
    }
}
