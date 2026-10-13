using Microsoft.AspNetCore.Mvc;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;

namespace WorkEz.WebUID.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServicesController(IServiceApplicationService serviceApplicationService) : ControllerBase
{
    private readonly IServiceApplicationService _serviceApplicationService = serviceApplicationService;

    [HttpPost]
    public async Task<IActionResult> CreateService([FromBody] CreateServiceRequest request)
    {
        var result = await _serviceApplicationService.CreateServiceAsync(request);
        if (result.IsFailure)
        {
            return BadRequest(new { error = result.Error, code = result.ErrorCode });
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var service = await _serviceApplicationService.GetByIdAsync(id);
        if (service is null)
        {
            return NotFound(new { error = "Serviço não encontrado." });
        }

        return Ok(service);
    }

    [HttpGet("customer/{customerId:guid}")]
    public async Task<IActionResult> GetByCustomer(Guid customerId)
    {
        var services = await _serviceApplicationService.GetByCustomerAsync(customerId);
        return Ok(services);
    }

    /// <summary>
    /// Atualiza o status do pedido/serviço e dispara e-mail com template temático para os envolvidos.
    /// </summary>
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateServiceStatusRequest request)
    {
        var result = await _serviceApplicationService.UpdateStatusAsync(id, request);
        if (result.IsFailure)
        {
            return BadRequest(new { error = result.Error, code = result.ErrorCode });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Fornecedor aceita realizar o pedido/serviço e dispara e-mail de confirmação para o cliente.
    /// </summary>
    [HttpPost("{id:guid}/provider-accept")]
    public async Task<IActionResult> ProviderAccept(Guid id, [FromBody] ProviderAcceptRequest request)
    {
        var result = await _serviceApplicationService.ProviderAcceptAsync(id, request);
        if (result.IsFailure)
        {
            return BadRequest(new { error = result.Error, code = result.ErrorCode });
        }

        return Ok(result.Value);
    }
}
