// Стъпка 37 — CategoryDto.cs
// DTO: категория
namespace TestApp.Api.Dtos.Categories;

public class CategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}
