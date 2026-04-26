namespace TestApp.Api.Services;

/// <summary>
/// Статичен помощен клас за почистване и извличане на JSON от AI отговори.
/// Двата provider-а (Anthropic, Groq) споделят същата логика.
/// </summary>
internal static class AiResponseParser
{
    /// <summary>
    /// Изчиства markdown code block и извлича JSON обект от суровия текст на AI.
    /// </summary>
    public static string CleanJson(string raw)
    {
        var clean = raw.Trim();

        // Изчиства markdown code block ако AI го е добавил (```json ... ```)
        if (clean.StartsWith("```"))
        {
            var start = clean.IndexOf('\n') + 1;
            var end   = clean.LastIndexOf("```");
            if (end > start)
                clean = clean[start..end].Trim();
        }

        // Извлича JSON обект ако има допълнителен текст около него
        var braceStart = clean.IndexOf('{');
        var braceEnd   = clean.LastIndexOf('}');
        if (braceStart >= 0 && braceEnd > braceStart)
            clean = clean[braceStart..(braceEnd + 1)];

        return clean;
    }

    /// <summary>
    /// Изгражда system prompt според типа на въпроса.
    /// </summary>
    public static string BuildSystemPrompt(string questionType) =>
        questionType == "Code"
            ? "You are a programming instructor grading a student's code answer. Be concise and fair."
            : "You are a teacher grading a student's open-ended answer. Be concise and fair.";

    /// <summary>
    /// Изгражда user prompt за оценяване.
    /// </summary>
    public static string BuildUserPrompt(string questionText, string? sampleAnswer, string studentAnswer, int maxPoints)
    {
        var sampleAnswerLine = sampleAnswer != null
            ? $"Expected/Sample answer: {sampleAnswer}"
            : "";

        var scoreJsonFormat = $"{{\"score\": integer 0 to {maxPoints}, \"feedback\": \"brief explanation in the same language as the question\"}}";

        return $"Grade this student answer. Respond with JSON only: {scoreJsonFormat}\n\n" +
               $"Question: {questionText}\n" +
               (string.IsNullOrEmpty(sampleAnswerLine) ? "" : sampleAnswerLine + "\n") +
               $"Student's answer: {studentAnswer}\n\n" +
               $"Score {maxPoints} for an excellent complete answer, score 0 for completely wrong or missing.";
    }
}
