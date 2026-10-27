using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkEz.Application.DTOs;
using WorkEz.Application.Interfaces;
using WorkEz.Application.Services;

namespace WorkEz.WebUID.Controllers;

/// <summary>
/// Autenticação: registro, login, refresh (com rotação), logout (revogação), reset de senha e verificação documental PDF.
/// Contrato consumido por WorkEzApp/services/authService.ts e documentService.ts.
/// </summary>
[ApiController]
[AllowAnonymous] // login, cadastro e refresh são públicos por natureza
[Route("api/[controller]")]
public class AuthController(
    IAuthApplicationService authService,
    IPdfDocumentValidatorService? pdfValidatorService = null,
    ILogger<AuthController>? logger = null
) : ControllerBase
{
    private const long MaxPdfSizeBytes = 5 * 1024 * 1024; // 5 MB
    private readonly IAuthApplicationService _authService = authService;
    private readonly IPdfDocumentValidatorService? _pdfValidatorService = pdfValidatorService;
    private readonly ILogger<AuthController>? _logger = logger;

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

    [HttpPost("reset-password")]
    [ProducesResponseType(typeof(ResetPasswordResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordByEmailRequest request)
    {
        var result = await _authService.ResetPasswordByEmailAsync(request);
        if (!result.IsSuccess)
        {
            return result.ErrorCode == "NOT_FOUND"
                ? NotFound(new { message = result.Error })
                : BadRequest(new { message = result.Error });
        }

        return Ok(result.Value);
    }

    [HttpPost("verify-document")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxPdfSizeBytes + (512 * 1024))]
    [ProducesResponseType(typeof(DocumentValidationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyDocument(
        IFormFile? file,
        [FromForm] string? documentNumber,
        [FromForm] string? role
    )
    {
        if (_pdfValidatorService == null)
            return BadRequest(new { message = "Serviço de validação de documentos PDF não configurado." });

        if (file == null && Request.HasFormContentType && Request.Form.Files.Count > 0)
            file = Request.Form.Files[0];

        if (string.IsNullOrWhiteSpace(documentNumber) && Request.HasFormContentType)
            documentNumber = Request.Form["documentNumber"].FirstOrDefault();

        if (string.IsNullOrWhiteSpace(role) && Request.HasFormContentType)
            role = Request.Form["role"].FirstOrDefault();

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Envie um arquivo PDF para verificação." });

        if (file.Length > MaxPdfSizeBytes)
            return BadRequest(new { message = "O arquivo PDF excede o limite máximo de 5 MB." });

        var fileName = file.FileName ?? string.Empty;
        var contentType = file.ContentType ?? string.Empty;
        if (!fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) &&
            !contentType.Contains("pdf", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Apenas arquivos no formato PDF (.pdf) são aceitos." });
        }

        if (string.IsNullOrWhiteSpace(documentNumber))
            return BadRequest(new { message = "Informe o número do documento (CPF ou CNPJ) para validação." });

        var digits = new string(documentNumber.Where(char.IsDigit).ToArray());
        var normalizedRole = (role ?? string.Empty).Trim().ToLowerInvariant();
        string resolvedType;

        if (normalizedRole is "provider" or "serviceprovider" or "cnpj" || digits.Length == 14)
        {
            resolvedType = "CNPJ";
        }
        else if (normalizedRole is "client" or "customer" or "cpf" || digits.Length == 11)
        {
            resolvedType = "CPF";
        }
        else
        {
            resolvedType = digits.Length > 11 ? "CNPJ" : "CPF";
        }

        await using var stream = file.OpenReadStream();
        _logger?.LogInformation("[AuthController.VerifyDocument] Recebido arquivo '{FileName}' ({Size} bytes), Tipo={Type}, Doc={Doc}", fileName, file.Length, resolvedType, digits);
        var result = await _pdfValidatorService.ValidateDocumentPdfAsync(stream, digits, resolvedType);

        if (!result.IsSuccess)
        {
            _logger?.LogWarning("[AuthController.VerifyDocument] Falha na validação: {Error} ({ErrorCode})", result.Error, result.ErrorCode);
            return BadRequest(new { message = result.Error, errorCode = result.ErrorCode });
        }

        _logger?.LogInformation(
            "[AuthController.VerifyDocument] Concluído: IsValid={IsValid}, Message='{Message}', Metadata={{Title='{Title}', Author='{Author}', Subject='{Subject}', Keywords='{Keywords}', Creator='{Creator}', Producer='{Producer}', Pages={Pages}, TextLength={TextLen}}}",
            result.Value.IsValid,
            result.Value.Message,
            result.Value.Metadata?.Title,
            result.Value.Metadata?.Author,
            result.Value.Metadata?.Subject,
            result.Value.Metadata?.Keywords,
            result.Value.Metadata?.Creator,
            result.Value.Metadata?.Producer,
            result.Value.Metadata?.PageCount,
            result.Value.Metadata?.ExtractedTextLength
        );

        if (!result.Value.IsValid)
            return BadRequest(result.Value);

        return Ok(result.Value);
    }

    [HttpPost("verify-document-base64")]
    [RequestSizeLimit(MaxPdfSizeBytes * 2)]
    [ProducesResponseType(typeof(DocumentValidationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyDocumentBase64([FromBody] VerifyDocumentBase64Request request)
    {
        if (_pdfValidatorService == null)
            return BadRequest(new { message = "Serviço de validação de documentos PDF não configurado." });

        if (string.IsNullOrWhiteSpace(request?.Base64Data))
            return BadRequest(new { message = "Envie um arquivo PDF para verificação." });

        if (string.IsNullOrWhiteSpace(request.DocumentNumber))
            return BadRequest(new { message = "Informe o número do documento (CPF ou CNPJ) para validação." });

        var rawBase64 = request.Base64Data.Trim();
        var commaIndex = rawBase64.IndexOf(',');
        if (rawBase64.StartsWith("data:", StringComparison.OrdinalIgnoreCase) && commaIndex >= 0)
        {
            rawBase64 = rawBase64[(commaIndex + 1)..];
        }

        byte[] pdfBytes;
        try
        {
            pdfBytes = Convert.FromBase64String(rawBase64);
        }
        catch
        {
            return BadRequest(new { message = "O arquivo PDF enviado não pôde ser decodificado." });
        }

        if (pdfBytes.Length == 0)
            return BadRequest(new { message = "O arquivo PDF enviado está vazio." });

        if (pdfBytes.Length > MaxPdfSizeBytes)
            return BadRequest(new { message = "O arquivo PDF excede o limite máximo de 5 MB." });

        var digits = new string(request.DocumentNumber.Where(char.IsDigit).ToArray());
        var normalizedRole = (request.Role ?? string.Empty).Trim().ToLowerInvariant();
        string resolvedType;

        if (normalizedRole is "provider" or "serviceprovider" or "cnpj" || digits.Length == 14)
        {
            resolvedType = "CNPJ";
        }
        else if (normalizedRole is "client" or "customer" or "cpf" || digits.Length == 11)
        {
            resolvedType = "CPF";
        }
        else
        {
            resolvedType = digits.Length > 11 ? "CNPJ" : "CPF";
        }

        _logger?.LogInformation("[AuthController.VerifyDocumentBase64] Recebido arquivo '{FileName}' ({Size} bytes), Tipo={Type}, Doc={Doc}", request.FileName, pdfBytes.Length, resolvedType, digits);

        await using var stream = new MemoryStream(pdfBytes);
        var result = await _pdfValidatorService.ValidateDocumentPdfAsync(stream, digits, resolvedType);

        if (!result.IsSuccess)
        {
            _logger?.LogWarning("[AuthController.VerifyDocumentBase64] Falha na validação: {Error} ({ErrorCode})", result.Error, result.ErrorCode);
            return BadRequest(new { message = result.Error, errorCode = result.ErrorCode });
        }

        _logger?.LogInformation(
            "[AuthController.VerifyDocumentBase64] Concluído: IsValid={IsValid}, Message='{Message}', Metadata={{Title='{Title}', Author='{Author}', Subject='{Subject}', Keywords='{Keywords}', Creator='{Creator}', Producer='{Producer}', Pages={Pages}, TextLength={TextLen}}}",
            result.Value.IsValid,
            result.Value.Message,
            result.Value.Metadata?.Title,
            result.Value.Metadata?.Author,
            result.Value.Metadata?.Subject,
            result.Value.Metadata?.Keywords,
            result.Value.Metadata?.Creator,
            result.Value.Metadata?.Producer,
            result.Value.Metadata?.PageCount,
            result.Value.Metadata?.ExtractedTextLength
        );

        if (!result.Value.IsValid)
            return BadRequest(result.Value);

        return Ok(result.Value);
    }
}
