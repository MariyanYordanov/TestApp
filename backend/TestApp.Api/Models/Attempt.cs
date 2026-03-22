// Стъпка 23 — Attempt.cs
// Entity: опит за решаване на тест
namespace TestApp.Api.Models;

public class Attempt
{
    // Уникален идентификатор на опита
    public Guid Id { get; set; } = Guid.NewGuid();

    // Име на участника
    public string ParticipantName { get; set; } = string.Empty;

    // Брой верни отговори
    public int Score { get; set; }

    // Общ брой въпроси
    public int TotalQuestions { get; set; }

    // Дата на опита
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Идентификатор на теста
    public Guid TestId { get; set; }

    // Навигационно свойство към теста
    public Test Test { get; set; } = null!;

    // Отговори на участника
    public List<AttemptAnswer> AttemptAnswers { get; set; } = new();
}
