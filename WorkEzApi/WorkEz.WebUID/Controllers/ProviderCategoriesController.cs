using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkEz.Domain.Entities;
using WorkEz.Infra.Data.Context;

namespace WorkEz.WebUID.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProviderCategoriesController(AppDbContext db) : ControllerBase
{
    /// <summary>
    /// Retorna as categorias associadas ao prestador especificado.
    /// GET /api/ProviderCategories/by-provider/{providerId}/categories
    /// </summary>
    [HttpGet("by-provider/{providerId:guid}/categories")]
    [ProducesResponseType(typeof(IEnumerable<CategoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByProvider(Guid providerId)
    {
        var categories = await db.ProviderCategories
            .AsNoTracking()
            .Where(pc => pc.ProviderId == providerId && pc.Status == "Active")
            .Include(pc => pc.Category)
            .Select(pc => new CategoryDto(pc.Category.Id, pc.Category.Name, pc.Category.Description))
            .ToListAsync();

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
        // Remove vínculos anteriores do prestador
        var existing = await db.ProviderCategories
            .Where(pc => pc.ProviderId == providerId)
            .ToListAsync();

        db.ProviderCategories.RemoveRange(existing);

        // Adiciona os novos vínculos
        if (categoryIds is { Count: > 0 })
        {
            var distinctIds = categoryIds.Distinct();
            foreach (var catId in distinctIds)
            {
                db.ProviderCategories.Add(new ProviderCategory
                {
                    ProviderId = providerId,
                    CategoryId = catId,
                    Status = "Active"
                });
            }
        }

        await db.SaveChangesAsync();
        return Ok(new { message = "Categorias atualizadas com sucesso." });
    }
}
