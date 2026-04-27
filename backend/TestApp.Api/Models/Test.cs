// Стъпка 23 — Test.cs
// Entity: тест, създаден от учител
namespace TestApp.Api.Models;

// Статус на теста
public enum TestStatus { Draft, Published, Archived }

public class Test
{
    // Уникален идентификатор на теста
    public Guid Id { get; set; } = Guid.NewGuid();

    // Заглавие на теста
    public string Title { get; set; } = string.Empty;

    // Описание на теста
    public string Description { get; set; } = string.Empty;

    // Продължителност в секунди (по подразбиране 30 минути)
    public int Duration { get; set; } = 1800;

    // Текущ статус на теста
    public TestStatus Status { get; set; } = TestStatus.Draft;

    // Код за споделяне с ученици
    public string ShareCode { get; set; } = string.Empty;

    // Дата на създаване
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Идентификатор на собственика
    public Guid OwnerId { get; set; }

    // Навигационно свойство към собственика
    public AppUser Owner { get; set; } = null!;

    // Въпроси в теста
    public List<Question> Questions { get; set; } = new();

    // Категории на теста (много-към-много)
    public List<TestCategory> TestCategories { get; set; } = new();

    // Целеви клас (информативно, показва се на ученика) — необязателно
    public string? TargetClass { get; set; }

    // Изисква email gate (opt-in) — само ученици от students.json могат да решават
    public bool RequireEmailGate { get; set; } = false;

    // Опити за решаване на теста
    public List<Attempt> Attempts { get; set; } = new();
}
