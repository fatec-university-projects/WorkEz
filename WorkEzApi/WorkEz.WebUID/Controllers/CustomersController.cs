using Microsoft.AspNetCore.Mvc;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.WebUID.Auth;

namespace WorkEz.WebUID.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CustomersController(ICustomerApplicationService customerService) : ControllerBase
{
    private readonly ICustomerApplicationService _customerService = customerService;

    /// <summary>
    /// Retorna perfil do cliente associado ao UserId (somente o próprio usuário ou Admin).
    /// Cria automaticamente se não existir.
    /// </summary>
    [HttpGet("by-user/{userId:guid}")]
    [ProducesResponseType(typeof(CustomerProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetByUserId(Guid userId)
    {
        var callerUserId = User.GetUserId();
        if (callerUserId is null)
            return Forbid();

        var result = await _customerService.GetByUserIdAsync(userId, callerUserId.Value, User.IsAdmin());
        if (!result.IsSuccess)
        {
            if (result.ErrorCode == "FORBIDDEN")
                return Forbid();

            return NotFound(new { message = result.Error });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Retorna dados do cliente pelo CustomerId. E-mail e telefone só para o próprio cliente (ou Admin).
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(CustomerProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var callerUserId = User.GetUserId();
        var result = await _customerService.GetByIdAsync(id, callerUserId, User.IsAdmin());
        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Error });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Retorna profissionais favoritados pelo cliente.
    /// GET /api/Customers/{userId}/favorites
    /// </summary>
    [HttpGet("{userId:guid}/favorites")]
    public IActionResult GetFavorites(Guid userId)
    {
        if (User.GetUserId() != userId && !User.IsAdmin())
            return Forbid();

        return Ok(Array.Empty<object>());
    }
}
