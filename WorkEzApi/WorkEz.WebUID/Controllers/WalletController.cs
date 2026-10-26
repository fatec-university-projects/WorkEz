using Microsoft.AspNetCore.Mvc;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.WebUID.Auth;

namespace WorkEz.WebUID.Controllers;

/// <summary>
/// WalletController — Gestão Financeira Completa (Delfinance).
/// Inclui carteira digital, custódia (escrow), comissão justa sobre mão de obra (materiais isentos) e saque PIX.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class WalletController(IWalletApplicationService walletService, IConfiguration? configuration = null) : ControllerBase
{
    private readonly IWalletApplicationService _walletService = walletService;
    private readonly IConfiguration? _configuration = configuration;

    /// <summary>
    /// Retorna o resumo financeiro da carteira do prestador (Saldo Disponível, Em Custódia e Total do Mês).
    /// </summary>
    /// <param name="providerId">Id do prestador ou UserId vinculado.</param>
    [HttpGet("summary/{providerId:guid}")]
    [ProducesResponseType(typeof(WalletSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSummary(Guid providerId)
    {
        var callerUserId = User.GetUserId();
        if (callerUserId == null) return Unauthorized(new { message = "Usuário não autenticado." });

        var result = await _walletService.GetSummaryAsync(providerId, callerUserId.Value, User.IsAdmin());
        if (!result.IsSuccess)
        {
            return result.ErrorCode switch
            {
                "FORBIDDEN" => StatusCode(StatusCodes.Status403Forbidden, new { message = result.Error, code = result.ErrorCode }),
                "PROVIDER_NOT_FOUND" => NotFound(new { message = result.Error, code = result.ErrorCode }),
                _ => BadRequest(new { message = result.Error, code = result.ErrorCode })
            };
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Retorna o extrato detalhado e paginado de transações da carteira com filtros por período e tipo.
    /// </summary>
    [HttpGet("statement/{providerId:guid}")]
    [ProducesResponseType(typeof(WalletStatementResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStatement(
        Guid providerId,
        [FromQuery] string? filter = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50)
    {
        var callerUserId = User.GetUserId();
        if (callerUserId == null) return Unauthorized(new { message = "Usuário não autenticado." });

        var filterDto = new WalletStatementFilterDto(
            Filter: filter ?? "all",
            StartDate: startDate,
            EndDate: endDate,
            PageNumber: pageNumber,
            PageSize: pageSize
        );

        var result = await _walletService.GetStatementAsync(providerId, filterDto, callerUserId.Value, User.IsAdmin());
        if (!result.IsSuccess)
        {
            return result.ErrorCode switch
            {
                "FORBIDDEN" => StatusCode(StatusCodes.Status403Forbidden, new { message = result.Error, code = result.ErrorCode }),
                "PROVIDER_NOT_FOUND" => NotFound(new { message = result.Error, code = result.ErrorCode }),
                _ => BadRequest(new { message = result.Error, code = result.ErrorCode })
            };
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Solicita transferência/saque instantâneo via PIX do saldo disponível da carteira (DelFinance BaaS).
    /// </summary>
    [HttpPost("withdraw")]
    [ProducesResponseType(typeof(WithdrawalResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Withdraw([FromBody] CreateWithdrawalRequestDto request)
    {
        var callerUserId = User.GetUserId();
        if (callerUserId == null) return Unauthorized(new { message = "Usuário não autenticado." });

        var result = await _walletService.RequestWithdrawalAsync(request, callerUserId.Value, User.IsAdmin());
        if (!result.IsSuccess)
        {
            return result.ErrorCode switch
            {
                "FORBIDDEN" => StatusCode(StatusCodes.Status403Forbidden, new { message = result.Error, code = result.ErrorCode }),
                "PROVIDER_NOT_FOUND" => NotFound(new { message = result.Error, code = result.ErrorCode }),
                _ => BadRequest(new { message = result.Error, code = result.ErrorCode })
            };
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Gera cobrança PIX dinâmica oficial (DelFinance BaaS) com QR Code e Copia-e-Cola para pagamento em custódia (Escrow).
    /// </summary>
    [HttpPost("checkout-pix/{serviceId:guid}")]
    [ProducesResponseType(typeof(EscrowCheckoutPixDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GenerateCheckoutPix(Guid serviceId)
    {
        var callerUserId = User.GetUserId();
        if (callerUserId == null) return Unauthorized(new { message = "Usuário não autenticado." });

        var result = await _walletService.GenerateEscrowPixCheckoutAsync(serviceId, callerUserId.Value, User.IsAdmin());
        if (!result.IsSuccess)
        {
            return result.ErrorCode switch
            {
                "FORBIDDEN" => StatusCode(StatusCodes.Status403Forbidden, new { message = result.Error, code = result.ErrorCode }),
                "SERVICE_NOT_FOUND" => NotFound(new { message = result.Error, code = result.ErrorCode }),
                _ => BadRequest(new { message = result.Error, code = result.ErrorCode })
            };
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Envia ou reenvia os dados do PIX (QR Code, Fatura e Copia-e-Cola) para o e-mail do cliente contratante.
    /// </summary>
    [HttpPost("resend-pix-email/{serviceId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ResendPixEmail(Guid serviceId)
    {
        var callerUserId = User.GetUserId();
        if (callerUserId == null) return Unauthorized(new { message = "Usuário não autenticado." });

        var result = await _walletService.SendPixInvoiceEmailAsync(serviceId, callerUserId.Value, User.IsAdmin());
        if (!result.IsSuccess)
        {
            return result.ErrorCode switch
            {
                "FORBIDDEN" => StatusCode(StatusCodes.Status403Forbidden, new { message = result.Error, code = result.ErrorCode }),
                "SERVICE_NOT_FOUND" => NotFound(new { message = result.Error, code = result.ErrorCode }),
                _ => BadRequest(new { message = result.Error, code = result.ErrorCode })
            };
        }

        return Ok(new { message = "E-mail com dados do PIX enviado com sucesso!" });
    }

    /// <summary>
    /// Webhook receptor de eventos DelFinance (PIX_RECEIVED, PIX_PAYMENT_EFFECTIVE, PIX_PAYMENT_ERROR).
    /// </summary>
    [HttpPost("webhook/delfinance")]
    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ReceiveDelFinanceWebhook([FromBody] DelFinanceWebhookPayload payload)
    {
        if (Request?.Headers != null)
        {
            var providedSecret = Request.Headers["x-delfinance-webhook-secret"].FirstOrDefault()
                ?? Request.Headers["x-webhook-secret"].FirstOrDefault();
            var configuredSecret = _configuration?["DelFinance:WebhookSecret"];

            if (!string.IsNullOrWhiteSpace(providedSecret)
                && !string.IsNullOrWhiteSpace(configuredSecret)
                && !string.Equals(providedSecret, configuredSecret, StringComparison.Ordinal))
            {
                return Unauthorized(new { message = "Assinatura/segredo do webhook inválido.", code = "INVALID_WEBHOOK_SECRET" });
            }
        }

        var result = await _walletService.ProcessDelFinanceWebhookAsync(payload);
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error, code = result.ErrorCode });
        }

        return Ok(new { received = true, eventType = payload.EventType });
    }
}
