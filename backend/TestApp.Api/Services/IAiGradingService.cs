namespace TestApp.Api.Services;

public interface IAiGradingService
{
    /// <summary>
    /// Оценява Open или Code отговор с Claude Haiku.
    /// Връща (score: 0..maxPoints, feedback: string).
    /// </summary>
    Task<(int Score, string Feedback)> GradeAnswerAsync(
        string questionText,
        string? sampleAnswer,
        string studentAnswer,
        string questionType,
        int maxPoints = 1);
}
