// Стъпка 23 — Question.cs
// Entity: въпрос в тест
namespace TestApp.Api.Models;

public class Question
{
    // Уникален идентификатор на въпроса
    public Guid Id { get; set; } = Guid.NewGuid();

    // Текст на въпроса
    public string Text { get; set; } = string.Empty;

    // Тип на въпроса: Closed | Multi | Open
    public string Type { get; set; } = "Closed";

    // Наредба на въпроса в теста
    public int OrderIndex { get; set; }

    // Идентификатор на теста
    public Guid TestId { get; set; }

    // Навигационно свойство към теста
    public Test Test { get; set; } = null!;

    // Отговори към въпроса
    public List<Answer> Answers { get; set; } = new();
}
