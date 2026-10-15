using Microsoft.AspNetCore.Mvc;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.WebUID.Auth;

namespace WorkEz.WebUID.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProviderCategoriesController(ICategoryApplicationService categoryService) : ControllerBase
{
    private readonly ICategoryApplicationService _categoryService = categoryService;

    /// <summary>
    /// Retorna as categorias associadas ao prestador especificado.
    /// GET /api/ProviderCategories/by-provider/{providerId}/categories
    /// </summary>
    [HttpGet("by-provider/{providerId:guid}/categories")]
    [ProducesResponseType(typeof(IEnumerable<CategoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByProvider(Guid providerId)
    {
        var categories = await _categoryService.GetByProviderIdAsync(providerId);
        return Ok(categories);
    }

    /// <summary>
    /// Atualiza/Vincula a lista de categorias selecionadas ao prestador.
    /// POST /api/ProviderCategories/by-provider/{providerId}/categories
    /// Body: ["id-1", "id-2"]
    /// </summary>
    [HttpPost("by-provider/{providerId:guid}/categories")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateCategories(Guid providerId, [FromBody] List<Guid> categoryIds)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Forbid();

        var result = await _categoryService.UpdateProviderCategoriesAsync(providerId, categoryIds, userId.Value, User.IsAdmin());
        if (!result.IsSuccess)
        {
            if (result.ErrorCode == "FORBIDDEN")
                return Forbid();

            return BadRequest(new { message = result.Error });
        }

        return Ok(new { message = "Categorias atualizadas com sucesso." });
    }
}
