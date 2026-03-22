// Стъпка 23 — Category.cs
// Entity: категория за тестове
namespace TestApp.Api.Models;

public class Category
{
    // Уникален идентификатор на категорията
    public Guid Id { get; set; } = Guid.NewGuid();

    // Наименование на категорията
    public string Name { get; set; } = string.Empty;

    // Тестове в тази категория (много-към-много)
    public List<TestCategory> TestCategories { get; set; } = new();
}
