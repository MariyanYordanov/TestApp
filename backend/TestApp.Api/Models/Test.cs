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

    // Целеви класове — съхраняваме като comma-separated string в съществуващата
    // TargetClass колона за да избегнем миграция. Helper методите GetTargetClasses
    // и SetTargetClasses правят split/join.
    // Ако е празно/null → тестът е отворен с линка.
    // Ако има класове → ученикът трябва да е в един от тях (по три имена).
    public string? TargetClass { get; set; }

    // Deprecated: запазено за избягване на миграция, не се ползва вече.
    // TargetClasses (multi-class gate) замества този флаг.
    public bool RequireEmailGate { get; set; } = false;

    // Парсва TargetClass като списък (CSV формат). Празно → []
    public List<string> GetTargetClasses()
    {
        if (string.IsNullOrWhiteSpace(TargetClass)) return new List<string>();
        return TargetClass.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();
    }

    // Записва списъка като CSV (без интервали)
    public void SetTargetClasses(IEnumerable<string>? classes)
    {
        TargetClass = classes == null ? null : string.Join(",", classes.Where(c => !string.IsNullOrWhiteSpace(c)));
        if (string.IsNullOrEmpty(TargetClass)) TargetClass = null;
    }

    // Опити за решаване на теста
    public List<Attempt> Attempts { get; set; } = new();
}
