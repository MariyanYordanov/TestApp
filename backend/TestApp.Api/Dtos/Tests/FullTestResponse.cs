// Стъпка 26 — FullTestResponse.cs
// DTO: пълен изглед на тест (за учителя, с верни отговори)
namespace TestApp.Api.Dtos.Tests;

public class FullTestResponse
{
    // Идентификатор на теста
    public Guid Id { get; set; }

    // Код за споделяне
    public string ShareCode { get; set; } = string.Empty;

    // Заглавие на теста
    public string Title { get; set; } = string.Empty;

    // Описание на теста
    public string Description { get; set; } = string.Empty;

    // Продължителност в секунди
    public int Duration { get; set; }

    // Статус на теста
    public string Status { get; set; } = string.Empty;

    // Дата на създаване
    public DateTime CreatedAt { get; set; }

    // Въпроси с верни отговори
    public List<FullQuestionDto> Questions { get; set; } = new();
}

// DTO за въпрос в пълен изглед
public class FullQuestionDto
{
    // Идентификатор на въпроса
    public Guid Id { get; set; }

    // Текст на въпроса
    public string Text { get; set; } = string.Empty;

    // Тип на въпроса: Closed | Multi | Open
    public string Type { get; set; } = "Closed";

    // Наредба
    public int OrderIndex { get; set; }

    // Примерен отговор (само за Open и Code въпроси)
    public string? SampleAnswer { get; set; }

    // Отговори с информация дали са верни
    public List<FullAnswerDto> Answers { get; set; } = new();
}

// DTO за отговор в пълен изглед (с IsCorrect)
public class FullAnswerDto
{
    // Идентификатор на отговора
    public Guid Id { get; set; }

    // Текст на отговора
    public string Text { get; set; } = string.Empty;

    // Дали отговорът е верен
    public bool IsCorrect { get; set; }

    // Наредба
    public int OrderIndex { get; set; }
}
