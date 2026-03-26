// Стъпка 26 — CreateTestRequest.cs
// DTO: заявка за създаване на нов тест
using System.ComponentModel.DataAnnotations;

namespace TestApp.Api.Dtos.Tests;

public class CreateTestRequest
{
    // Заглавие на теста (задължително)
    [Required(ErrorMessage = "Заглавието е задължително.")]
    public string Title { get; set; } = string.Empty;

    // Описание на теста
    public string Description { get; set; } = string.Empty;

    // Продължителност в секунди (по подразбиране 30 минути)
    public int Duration { get; set; } = 1800;

    // Идентификатори на категории
    public List<string> CategoryIds { get; set; } = new();

    // Въпроси в теста
    public List<CreateQuestionDto> Questions { get; set; } = new();
}

// DTO за въпрос при създаване
public class CreateQuestionDto
{
    // Текст на въпроса
    [Required(ErrorMessage = "Текстът на въпроса е задължителен.")]
    public string Text { get; set; } = string.Empty;

    // Тип на въпроса: Closed | Multi | Open
    [AllowedValues("Closed", "Multi", "Open", "Code",
        ErrorMessage = "Типът трябва да бъде Closed, Multi, Open или Code.")]
    public string Type { get; set; } = "Closed";

    // Точки за въпроса (по подразбиране 1, мин 1 макс 100)
    [Range(1, 100, ErrorMessage = "Точките трябва да бъдат между 1 и 100.")]
    public int Points { get; set; } = 1;

    // Примерен отговор (само за Open и Code въпроси, незадължителен, макс 50000 символа)
    [MaxLength(50000)]
    public string? SampleAnswer { get; set; }

    // Отговори към въпроса (за Open тип — празен масив)
    public List<CreateAnswerDto> Answers { get; set; } = new();
}

// DTO за отговор при създаване
public class CreateAnswerDto
{
    // Текст на отговора
    [Required(ErrorMessage = "Текстът на отговора е задължителен.")]
    public string Text { get; set; } = string.Empty;

    // Дали отговорът е верен
    public bool IsCorrect { get; set; }
}
