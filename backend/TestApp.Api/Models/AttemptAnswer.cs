// Стъпка 23 — AttemptAnswer.cs
// Entity: избран отговор в опит
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

    // Дали отговорът е верен
    public bool IsCorrect { get; set; }
}
