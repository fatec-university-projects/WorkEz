using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.Domain.Common;
using WorkEz.WebUID.Auth;

namespace WorkEz.WebUID.Controllers;

public record CompleteServiceBodyRequest(decimal? Price);

/// <summary>
/// Controller magra (Thin Controller) para Serviços e Chamados em Clean Architecture.
/// Responsável unicamente pelo transporte HTTP, extração do usuário autenticado (JWT)
/// e delegação dos casos de uso para a camada de Application.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ServicesController(
    IServiceOpportunityApplicationService opportunityService,
    IServiceApplicationService serviceAppService
) : ControllerBase
{
    private readonly IServiceOpportunityApplicationService _opportunityService = opportunityService;
    private readonly IServiceApplicationService _serviceAppService = serviceAppService;

    /// <summary>
    /// Retorna chamados em aberto para o prestador.
    /// Se ele tiver categorias definidas, filtra por elas.
    /// Se NÃO tiver nenhuma área, retorna TODOS os chamados em aberto.
    /// </summary>
    [HttpGet("opportunities-by-user/{userId:guid}")]
    [ProducesResponseType(typeof(IEnumerable<OpportunityCallDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOpportunities(Guid userId)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();
        if (me.Value != userId && !User.IsAdmin()) return Forbid();

        var result = await _opportunityService.GetOpportunitiesAsync(userId);
        return result.IsSuccess 
            ? Ok(result.Value) 
            : NotFound(new { message = result.Error, code = result.ErrorCode });
    }

    /// <summary>
    /// Retorna os chamados aceitos/agendados do prestador.
    /// </summary>
    [HttpGet("by-provider-user/{userId:guid}")]
    [ProducesResponseType(typeof(IEnumerable<OpportunityCallDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAcceptedByProviderUser(Guid userId)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _serviceAppService.GetAcceptedByProviderUserAsync(userId, me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    /// <summary>
    /// Cria um novo chamado associado a um cliente.
    /// </summary>
    [HttpPost("by-customer/{customerId:guid}")]
    public async Task<IActionResult> CreateService(Guid customerId, [FromBody] CreateServiceRequest request)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _serviceAppService.CreateServiceAsync(customerId, request, me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    /// <summary>
    /// Retorna os chamados criados por um cliente.
    /// </summary>
    [HttpGet("by-customer/{customerId:guid}")]
    public async Task<IActionResult> GetByCustomer(Guid customerId)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _serviceAppService.GetByCustomerAsync(customerId, me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    /// <summary>
    /// Retorna os detalhes de um chamado pelo Id.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _serviceAppService.GetByIdAsync(id, me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    /// <summary>
    /// Atualiza status de um chamado (ex: cancelamento).
    /// </summary>
    [HttpPut("{id:guid}/status")]
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromQuery] bool? status)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _serviceAppService.UpdateStatusAsync(id, status, me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    /// <summary>
    /// Prestador inicia deslocamento até o cliente.
    /// </summary>
    [HttpPost("{id:guid}/start-displacement")]
    [HttpPatch("{id:guid}/start-displacement")]
    public async Task<IActionResult> StartDisplacement(Guid id)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _serviceAppService.StartDisplacementAsync(id, me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    /// <summary>
    /// Prestador inicia o serviço no local.
    /// </summary>
    [HttpPost("{id:guid}/start")]
    [HttpPatch("{id:guid}/start")]
    public async Task<IActionResult> StartService(Guid id)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _serviceAppService.StartServiceAsync(id, me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    /// <summary>
    /// Valida o código OTP gerado no app do cliente antes de alterar o status para InProgress.
    /// </summary>
    [HttpPost("{id:guid}/validate-checkin")]
    [ProducesResponseType(typeof(ServiceStatusResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ValidateCheckIn(Guid id, [FromBody] ValidateCheckInRequest request)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _serviceAppService.ValidateCheckInAsync(id, request.Code, me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    /// <summary>
    /// Upload com carimbo de data/hora (Timestamp) das vistorias (fotos de antes ou depois).
    /// </summary>
    [HttpPost("{id:guid}/checklist-photos")]
    [ProducesResponseType(typeof(ServiceDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ChecklistPhotos(Guid id, [FromBody] ChecklistPhotosRequest request)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _serviceAppService.UploadChecklistPhotosAsync(id, request, me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    /// <summary>
    /// Prestador conclui o serviço e informa valor final (via query string ou JSON body).
    /// </summary>
    [HttpPost("{id:guid}/complete")]
    [HttpPatch("{id:guid}/complete")]
    public async Task<IActionResult> CompleteService(
        Guid id,
        [FromQuery] decimal? price = null,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] CompleteServiceBodyRequest? body = null)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var effectivePrice = price ?? body?.Price;
        var result = await _serviceAppService.CompleteServiceAsync(id, effectivePrice, me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    /// <summary>
    /// Confirma o pagamento do serviço (PIX DelFinance ou simulação).
    /// Avança o status para Completed e libera os recursos para a carteira do prestador.
    /// </summary>
    [HttpPost("{id:guid}/confirm-payment")]
    [HttpPatch("{id:guid}/confirm-payment")]
    public async Task<IActionResult> ConfirmPayment(Guid id)
    {
        var me = User.GetUserId();
        if (me == null) return Unauthorized();

        var result = await _serviceAppService.ConfirmPaymentAsync(id, me.Value, User.IsAdmin());
        return ToActionResult(result);
    }

    private IActionResult ToActionResult<T>(Result<T> result)
    {
        if (result.IsSuccess) return Ok(result.Value);

        return result.ErrorCode switch
        {
            "FORBIDDEN" => Forbid(),
            "UNAUTHORIZED" => Unauthorized(),
            "SERVICE_NOT_FOUND" or "CUSTOMER_NOT_FOUND" or "NOT_FOUND" => NotFound(new { message = result.Error, code = result.ErrorCode }),
            _ => BadRequest(new { message = result.Error, code = result.ErrorCode })
        };
    }
}
