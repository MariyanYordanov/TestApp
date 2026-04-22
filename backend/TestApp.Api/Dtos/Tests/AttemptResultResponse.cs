// Стъпка 26 — AttemptResultResponse.cs
// DTO: резултат от предаден опит
namespace TestApp.Api.Dtos.Tests;

public class AttemptResultResponse
{
    // Точки спечелени от затворени/multi въпроси
    public int Score { get; set; }

    // Максимални точки от затворени/multi въпроси
    public int MaxScore { get; set; }

    // Реален брой въпроси в теста
    public int TotalQuestions { get; set; }

    // Процент спрямо затворените въпроси
    public double Percent { get; set; }

    // Детайлни резултати по въпроси
    public List<AttemptQuestionResult> Results { get; set; } = new();
}

// Резултат за конкретен въпрос
// ВАЖНО: CorrectAnswerId умишлено НЕ се включва — предотвратява изтичане на верните отговори
public class AttemptQuestionResult
{
    // Идентификатор на въпроса
    public Guid QuestionId { get; set; }

    // Текст на въпроса
    public string QuestionText { get; set; } = string.Empty;

    // Тип на въпроса (Closed, Multi, Open, Code)
    public string QuestionType { get; set; } = string.Empty;

    // Идентификатор на избрания отговор
    public Guid? SelectedAnswerId { get; set; }

    // Дали отговорът е верен (null = чака AI оценяване)
    public bool? IsCorrect { get; set; }
}
