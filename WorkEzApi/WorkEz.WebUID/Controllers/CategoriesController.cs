using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;

namespace WorkEz.WebUID.Controllers;

[ApiController]
[AllowAnonymous] // catálogo público de categorias (usado no cadastro do prestador)
[Route("api/[controller]")]
public class CategoriesController(ICategoryApplicationService categoryService) : ControllerBase
{
    private readonly ICategoryApplicationService _categoryService = categoryService;

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<CategoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var categories = await _categoryService.GetAllAsync();
        return Ok(categories);
    }
}
