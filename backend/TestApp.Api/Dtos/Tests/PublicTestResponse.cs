// Стъпка 26 — PublicTestResponse.cs
// DTO: публичен изглед на тест (за ученици, БЕЗ верни отговори)
namespace TestApp.Api.Dtos.Tests;

public class PublicTestResponse
{
    // Код за споделяне
    public string ShareCode { get; set; } = string.Empty;

    // Заглавие на теста
    public string Title { get; set; } = string.Empty;

    // Описание на теста
    public string Description { get; set; } = string.Empty;

    // Продължителност в секунди
    public int Duration { get; set; }

    // Целеви клас (информативно — показва се на ученика)
    public string? TargetClass { get; set; }

    // Изисква email gate (за да знае UI дали да покаже email поле)
    public bool RequireEmailGate { get; set; }

    // Въпроси (БЕЗ информация за верни отговори)
    public List<PublicQuestionDto> Questions { get; set; } = new();
}

// DTO за въпрос в публичен изглед
public class PublicQuestionDto
{
    // Идентификатор на въпроса
    public Guid Id { get; set; }

    // Текст на въпроса
    public string Text { get; set; } = string.Empty;

    // Тип на въпроса: Closed | Multi | Open (нужен на ученика за рендиране)
    public string Type { get; set; } = "Closed";

    // Отговори (БЕЗ информация дали са верни)
    public List<PublicAnswerDto> Answers { get; set; } = new();
}

// DTO за отговор в публичен изглед (БЕЗ IsCorrect)
public class PublicAnswerDto
{
    // Идентификатор на отговора
    public Guid Id { get; set; }

    // Текст на отговора
    public string Text { get; set; } = string.Empty;
}
