using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;
using Microsoft.EntityFrameworkCore;
using WorkEz.Api.Entities;
using WorkEz.Api.Services;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages the link between service providers and the categories they cover.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ProviderCategoriesController(AppDbContext context, IProviderCategoryService providerCategoryService) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("by-provider/{providerId}")]
    public async Task<IActionResult> GetProviderCategoriesByProvider(Guid providerId)
    {
        var list = await context.ProviderCategories.AsNoTracking().Where(pc => pc.ProviderId == providerId).ToListAsync();
        return Ok(list);
    }

    [AllowAnonymous]
    [HttpPost("by-provider/{providerId}/categories")]
    public async Task<IActionResult> CreateProviderCategories(Guid providerId, [FromBody] List<Guid> categoryIds)
    {
        if (categoryIds is null || !categoryIds.Any()) return BadRequest(new { message = "categoryIds required" });

        foreach (var catId in categoryIds)
        {
            var entity = new ProviderCategory { ProviderId = providerId, CategoryId = catId };
            await providerCategoryService.CreateAsync(entity);
        }

        return NoContent();
    }

    [AllowAnonymous]
    [HttpDelete("by-provider/{providerId}/category/{categoryId}")]
    public async Task<IActionResult> DeleteProviderCategory(Guid providerId, Guid categoryId)
    {
        var existing = await context.ProviderCategories.FirstOrDefaultAsync(pc => pc.ProviderId == providerId && pc.CategoryId == categoryId);
        if (existing is null) return NotFound();
        await providerCategoryService.DeleteAsync(existing.Id);
        return NoContent();
    }
}
