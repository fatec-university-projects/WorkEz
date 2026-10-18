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
public class WalletController(IWalletApplicationService walletService) : ControllerBase
{
    private readonly IWalletApplicationService _walletService = walletService;

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
    public async Task<IActionResult> GetStatement(Guid providerId, [FromQuery] WalletStatementFilterDto filter)
    {
        var callerUserId = User.GetUserId();
        if (callerUserId == null) return Unauthorized(new { message = "Usuário não autenticado." });

        var result = await _walletService.GetStatementAsync(providerId, filter, callerUserId.Value, User.IsAdmin());
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
    /// Webhook receptor de eventos DelFinance (PIX_RECEIVED, PIX_PAYMENT_EFFECTIVE, PIX_PAYMENT_ERROR).
    /// </summary>
    [HttpPost("webhook/delfinance")]
    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ReceiveDelFinanceWebhook([FromBody] DelFinanceWebhookPayload payload)
    {
        var result = await _walletService.ProcessDelFinanceWebhookAsync(payload);
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error, code = result.ErrorCode });
        }

        return Ok(new { received = true, eventType = payload.EventType });
    }
}
