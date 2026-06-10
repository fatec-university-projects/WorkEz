using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;
using WorkEz.Api.Entities;
using WorkEz.Api.Services;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages service categories (e.g. Electrical, Plumbing, Painting).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class CategoriesController(AppDbContext context, ICategoryService categoryService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAllCategories()
    {
        var list = await categoryService.GetAllAsync();
        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCategoryById(Guid id)
    {
        var entity = await categoryService.GetByIdAsync(id);
        return entity is null ? NotFound() : Ok(entity);
    }

    [HttpPost]
    public async Task<IActionResult> CreateCategory([FromBody] Category category)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        await categoryService.CreateAsync(category);
        return CreatedAtAction(nameof(GetCategoryById), new { id = category.Id }, category);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] Category category)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (id != category.Id) return BadRequest(new { message = "Id mismatch." });
        var existing = await categoryService.GetByIdAsync(id);
        if (existing is null) return NotFound();
        await categoryService.UpdateAsync(category);
        return NoContent();
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateCategoryStatus(Guid id, bool status)
    {
        var entity = await categoryService.GetByIdAsync(id);
        if (entity is null) return NotFound();
        entity.Status = status ? Enums.CategoryStatus.Active : Enums.CategoryStatus.Inactive;
        await categoryService.UpdateAsync(entity);
        return NoContent();
    }
}
