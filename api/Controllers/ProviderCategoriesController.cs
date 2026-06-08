using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages the link between service providers and the categories they cover.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ProviderCategoriesController(AppDbContext context) : ControllerBase
{
    [HttpGet("by-provider/{providerId}")]
    public async Task<IActionResult> GetProviderCategoriesByProvider(Guid providerId)
    {
        throw notimplementedException;
    }

    [HttpPost("by-provider/{providerId}/categories")]
    public async Task<IActionResult> CreateProviderCategories(Guid providerId, List<Guid> categoryIds)
    {
        throw notimplementedException;
    }

    [HttpDelete("by-provider/{providerId}/category/{categoryId}")]
    public async Task<IActionResult> DeleteProviderCategory(Guid providerId, Guid categoryId)
    {
        throw notimplementedException;
    }
}
