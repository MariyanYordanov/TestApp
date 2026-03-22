// Стъпка 23 — Answer.cs
// Entity: отговор към въпрос
namespace TestApp.Api.Models;

public class Answer
{
    // Уникален идентификатор на отговора
    public Guid Id { get; set; } = Guid.NewGuid();

    // Текст на отговора
    public string Text { get; set; } = string.Empty;

    // Дали отговорът е верен
    public bool IsCorrect { get; set; }

    // Наредба на отговора
    public int OrderIndex { get; set; }

    // Идентификатор на въпроса
    public Guid QuestionId { get; set; }

    // Навигационно свойство към въпроса
    public Question Question { get; set; } = null!;
}
