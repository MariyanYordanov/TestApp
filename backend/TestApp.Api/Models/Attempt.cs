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

    // Имейл на участника (само при email gate тестове, нормализиран lowercase)
    public string? ParticipantEmail { get; set; }

    // Дали опитът е анулиран от учителя (позволява повторно решаване)
    public bool IsVoided { get; set; } = false;

    // Отговори на участника
    public List<AttemptAnswer> AttemptAnswers { get; set; } = new();
}
