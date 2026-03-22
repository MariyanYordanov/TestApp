// Стъпка 37 — CategoryService.cs
// Услуга за управление на категории
using Microsoft.EntityFrameworkCore;
using TestApp.Api.Data;
using TestApp.Api.Dtos.Categories;
using TestApp.Api.Models;

namespace TestApp.Api.Services;

public class CategoryService : ICategoryService
{
    private readonly AppDbContext _db;

    public CategoryService(AppDbContext db)
    {
        _db = db;
    }

    // Връща всички категории, наредени по азбучен ред
    public async Task<List<CategoryDto>> GetAllAsync()
    {
        return await _db.Categories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CategoryDto { Id = c.Id, Name = c.Name })
            .ToListAsync();
    }

    // Създава нова категория (нов обект - immutable pattern)
    public async Task<CategoryDto> CreateAsync(CreateCategoryRequest request)
    {
        var category = new Category
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim()
        };

        _db.Categories.Add(category);
        await _db.SaveChangesAsync();

        return new CategoryDto { Id = category.Id, Name = category.Name };
    }

    // Изтрива категория по Id, връща false ако не съществува
    public async Task<bool> DeleteAsync(Guid id)
    {
        var category = await _db.Categories.FindAsync(id);
        if (category is null) return false;

        _db.Categories.Remove(category);
        await _db.SaveChangesAsync();
        return true;
    }
}
