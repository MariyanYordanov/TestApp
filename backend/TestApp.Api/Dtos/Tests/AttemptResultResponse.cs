// Стъпка 26 — AttemptResultResponse.cs
// DTO: резултат от предаден опит
namespace TestApp.Api.Dtos.Tests;

public class AttemptResultResponse
{
    // Брой верни отговори
    public int Score { get; set; }

    // Общ брой въпроси
    public int TotalQuestions { get; set; }

    // Процент верни отговори
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

    // Идентификатор на избрания отговор
    public Guid? SelectedAnswerId { get; set; }

    // Дали отговорът е верен
    public bool IsCorrect { get; set; }
}
