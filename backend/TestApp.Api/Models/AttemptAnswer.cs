// Стъпка 23 — AttemptAnswer.cs
// Entity: избран отговор в опит
using System.ComponentModel.DataAnnotations;
using TestApp.Api.Models.Enums;
namespace TestApp.Api.Models;

public class AttemptAnswer
{
    // Уникален идентификатор
    public Guid Id { get; set; } = Guid.NewGuid();

    // Идентификатор на опита
    public Guid AttemptId { get; set; }

    // Навигационно свойство към опита
    public Attempt Attempt { get; set; } = null!;

    // Идентификатор на въпроса
    public Guid QuestionId { get; set; }

    // Навигационно свойство към въпроса
    public Question Question { get; set; } = null!;

    // Идентификатор на избрания отговор (null ако не е избран)
    public Guid? SelectedAnswerId { get; set; }

    // Навигационно свойство към избрания отговор
    public Answer? SelectedAnswer { get; set; }

    // Свободен текстов отговор (за Open и Code въпроси)
    [MaxLength(50000)]
    public string? OpenText { get; set; }

    // Дали отговорът е верен
    public bool IsCorrect { get; set; }

    // Статус на AI оценяване (NotApplicable за Closed/Multi, Pending/Graded/Failed за Open/Code)
    public GradingStatus GradingStatus { get; set; } = GradingStatus.NotApplicable;

    // AI оценка: 0 или 1 (може да се разшири за частично точкуване)
    public int? AiScore { get; set; }

    // Обяснение от AI
    public string? AiFeedback { get; set; }

    // Дата и час на оценяване от AI
    public DateTime? GradedAt { get; set; }
}
