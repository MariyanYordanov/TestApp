// Стъпка 38 — CategoriesController.cs
// Контролер за управление на категории
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TestApp.Api.Dtos.Categories;
using TestApp.Api.Services;

namespace TestApp.Api.Controllers;

[Route("api/categories")]
[ApiController]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _categoryService;

    public CategoriesController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    // GET api/categories — връща всички категории
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var categories = await _categoryService.GetAllAsync();
        return Ok(categories);
    }

    // POST api/categories — създава нова категория
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCategoryRequest request)
    {
        var category = await _categoryService.CreateAsync(request);
        return StatusCode(StatusCodes.Status201Created, category);
    }

    // DELETE api/categories/{id} — изтрива категория
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _categoryService.DeleteAsync(id);
        if (!deleted) return NotFound(new { error = "Категорията не е намерена." });
        return NoContent();
    }
}
