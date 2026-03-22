// Стъпка 23 — TestCategory.cs
// Entity: свързваща таблица тест-категория (много-към-много)
namespace TestApp.Api.Models;

public class TestCategory
{
    // Идентификатор на теста
    public Guid TestId { get; set; }

    // Навигационно свойство към теста
    public Test Test { get; set; } = null!;

    // Идентификатор на категорията
    public Guid CategoryId { get; set; }

    // Навигационно свойство към категорията
    public Category Category { get; set; } = null!;
}
