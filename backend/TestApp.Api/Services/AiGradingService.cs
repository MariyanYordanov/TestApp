using System.Text;
using System.Text.Json;

namespace TestApp.Api.Services;

public class AiGradingService : IAiGradingService
{
    private readonly HttpClient _http;
    private readonly string _apiKey;
    private readonly ILogger<AiGradingService> _logger;

    public AiGradingService(HttpClient http, IConfiguration config, ILogger<AiGradingService> logger)
    {
        _http = http;
        _apiKey = config["Anthropic:ApiKey"] ?? throw new InvalidOperationException("Anthropic:ApiKey not configured");
        _logger = logger;
    }

    public async Task<(int Score, string Feedback)> GradeAnswerAsync(
        string questionText, string? sampleAnswer, string studentAnswer, string questionType,
        int maxPoints = 1)
    {
        var systemPrompt = questionType == "Code"
            ? "You are a programming instructor grading a student's code answer. Be concise and fair."
            : "You are a teacher grading a student's open-ended answer. Be concise and fair.";

        var sampleAnswerLine = sampleAnswer != null
            ? $"Expected/Sample answer: {sampleAnswer}"
            : "";

        // Подкана с конкретния максимален брой точки
        var scoreJsonFormat = $"{{\"score\": integer 0 to {maxPoints}, \"feedback\": \"brief explanation in the same language as the question\"}}";
        var userPrompt = $"Grade this student answer. Respond with JSON only: {scoreJsonFormat}\n\n" +
                         $"Question: {questionText}\n" +
                         (string.IsNullOrEmpty(sampleAnswerLine) ? "" : sampleAnswerLine + "\n") +
                         $"Student's answer: {studentAnswer}\n\n" +
                         $"Score {maxPoints} for an excellent complete answer, score 0 for completely wrong or missing.";

        var requestBody = new
        {
            model = "claude-haiku-4-5-20251001",
            max_tokens = 256,
            system = systemPrompt,
            messages = new[] { new { role = "user", content = userPrompt } }
        };

        var json = JsonSerializer.Serialize(requestBody);
        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
        request.Headers.Add("x-api-key", _apiKey);
        request.Headers.Add("anthropic-version", "2023-06-01");

        try
        {
            var response = await _http.SendAsync(request);
            response.EnsureSuccessStatusCode();
            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);

            var text = doc.RootElement
                .GetProperty("content")[0]
                .GetProperty("text")
                .GetString() ?? "";

            // Изчиства markdown code block ако AI го е добавил (```json ... ```)
            var clean = text.Trim();
            if (clean.StartsWith("```"))
            {
                var start = clean.IndexOf('\n') + 1;
                var end   = clean.LastIndexOf("```");
                if (end > start) clean = clean[start..end].Trim();
            }

            // Извлича JSON обект ако има допълнителен текст около него
            var braceStart = clean.IndexOf('{');
            var braceEnd   = clean.LastIndexOf('}');
            if (braceStart >= 0 && braceEnd > braceStart)
                clean = clean[braceStart..(braceEnd + 1)];

            // Разбира JSON отговора от AI
            using var resultDoc = JsonDocument.Parse(clean);
            var score    = resultDoc.RootElement.GetProperty("score").GetInt32();
            var feedback = resultDoc.RootElement.GetProperty("feedback").GetString() ?? "";

            // Ограничаваме резултата в диапазона [0, maxPoints]
            return (Math.Clamp(score, 0, maxPoints), feedback);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI grading failed for question: {Question}", questionText);
            throw;
        }
    }
}
