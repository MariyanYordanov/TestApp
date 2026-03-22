// Стъпка 37 — ICategoryService.cs
// Интерфейс за услугата за категории
using TestApp.Api.Dtos.Categories;

namespace TestApp.Api.Services;

public interface ICategoryService
{
    Task<List<CategoryDto>> GetAllAsync();
    Task<CategoryDto> CreateAsync(CreateCategoryRequest request);
    Task<bool> DeleteAsync(Guid id);
}
