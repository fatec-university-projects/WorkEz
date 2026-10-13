using Microsoft.AspNetCore.Mvc;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;

namespace WorkEz.WebUID.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController(IPaymentApplicationService paymentApplicationService) : ControllerBase
{
    private readonly IPaymentApplicationService _paymentApplicationService = paymentApplicationService;

    /// <summary>
    /// Notificação ou finalização de pagamento pelo cliente. Dispara e-mails com comprovante e libera o serviço.
    /// </summary>
    [HttpPost("confirm")]
    public async Task<IActionResult> ConfirmPayment([FromBody] ProcessPaymentRequest request)
    {
        var result = await _paymentApplicationService.ProcessPaymentAsync(request);
        if (result.IsFailure)
        {
            return BadRequest(new { error = result.Error, code = result.ErrorCode });
        }

        return Ok(result.Value);
    }
}
