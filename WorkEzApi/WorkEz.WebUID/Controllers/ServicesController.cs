using Microsoft.AspNetCore.Mvc;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;

namespace WorkEz.WebUID.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServicesController(IServiceOpportunityApplicationService opportunityService) : ControllerBase
{
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
        var result = await opportunityService.GetOpportunitiesAsync(userId);
        return result.IsSuccess 
            ? Ok(result.Value) 
            : NotFound(new { message = result.Error, code = result.ErrorCode });
    }
}
