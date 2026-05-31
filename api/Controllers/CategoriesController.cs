using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages service categories (e.g. Electrical, Plumbing, Painting).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class CategoriesController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAllCategories()
    {
        throw notimplementedException;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCategoryById(Guid id)
    {
        throw notimplementedException;
    }

    [HttpPost]
    public async Task<IActionResult> CreateCategory(Category category)
    {
        throw notimplementedException;
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCategory(Guid id, Category category)
    {
        throw notimplementedException;
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateCategoryStatus(Guid id, bool status)
    {
        throw notimplementedException;
    }
}
