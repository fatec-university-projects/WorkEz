using Microsoft.AspNetCore.Mvc;

namespace WorkEz.WebUID.Controllers;

public record Base64UploadRequest(string? Data, string? Filename);

/// <summary>
/// Controlador para upload de fotos de perfil, portfolio e documentos.
/// Armazena em wwwroot/uploads e disponibiliza via URL estática.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class UploadsController(IWebHostEnvironment env) : ControllerBase
{
    private string GetUploadsFolder()
    {
        var root = env.WebRootPath;
        if (string.IsNullOrWhiteSpace(root))
        {
            root = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        }
        var uploads = Path.Combine(root, "uploads");
        if (!Directory.Exists(uploads))
        {
            Directory.CreateDirectory(uploads);
        }
        return uploads;
    }

    /// <summary>
    /// Upload de imagem via multipart/form-data.
    /// </summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload(IFormFile? file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Nenhum arquivo enviado." });
        }

        var uploadsFolder = GetUploadsFolder();
        var ext = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(ext)) ext = ".jpg";

        var fileName = $"{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(uploadsFolder, fileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var url = $"{baseUrl}/uploads/{fileName}";

        return Ok(new { url });
    }

    /// <summary>
    /// Upload de imagem codificada em Base64 (compatível com Web e Mobile).
    /// </summary>
    [HttpPost("base64")]
    public async Task<IActionResult> UploadBase64([FromBody] Base64UploadRequest request)
    {
        if (string.IsNullOrWhiteSpace(request?.Data))
        {
            return BadRequest(new { message = "Dados da imagem vazios." });
        }

        var uploadsFolder = GetUploadsFolder();
        var rawData = request.Data.Trim();
        var ext = ".jpg";

        if (rawData.StartsWith("data:image/"))
        {
            var headerEnd = rawData.IndexOf(";base64,", StringComparison.Ordinal);
            if (headerEnd > 0)
            {
                var mime = rawData.Substring("data:image/".Length, headerEnd - "data:image/".Length);
                if (mime.Contains("png")) ext = ".png";
                else if (mime.Contains("webp")) ext = ".webp";
                else if (mime.Contains("gif")) ext = ".gif";
                rawData = rawData.Substring(headerEnd + ";base64,".Length);
            }
            else
            {
                var commaIdx = rawData.IndexOf(',');
                if (commaIdx >= 0) rawData = rawData[(commaIdx + 1)..];
            }
        }

        try
        {
            var bytes = Convert.FromBase64String(rawData);
            var fileName = $"{Guid.NewGuid():N}{ext}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            await System.IO.File.WriteAllBytesAsync(filePath, bytes);

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var url = $"{baseUrl}/uploads/{fileName}";

            return Ok(new { url });
        }
        catch (FormatException)
        {
            return BadRequest(new { message = "Formato Base64 inválido." });
        }
    }
}
