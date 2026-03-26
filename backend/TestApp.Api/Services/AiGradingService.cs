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
        string questionText, string? sampleAnswer, string studentAnswer, string questionType)
    {
        var systemPrompt = questionType == "Code"
            ? "You are a programming instructor grading a student's code answer. Be concise and fair."
            : "You are a teacher grading a student's open-ended answer. Be concise and fair.";

        var sampleAnswerLine = sampleAnswer != null
            ? $"Expected/Sample answer: {sampleAnswer}"
            : "";

        var scoreJsonFormat = "{\"score\": 0 or 1, \"feedback\": \"brief explanation in the same language as the question\"}";
        var userPrompt = $"Grade this student answer. Respond with JSON only: {scoreJsonFormat}\n\n" +
                         $"Question: {questionText}\n" +
                         (string.IsNullOrEmpty(sampleAnswerLine) ? "" : sampleAnswerLine + "\n") +
                         $"Student's answer: {studentAnswer}\n\n" +
                         "Score 1 if the answer demonstrates understanding of the concept. Score 0 if incorrect or insufficient.";

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

            // Разбира JSON отговора от AI
            using var resultDoc = JsonDocument.Parse(text.Trim());
            var score = resultDoc.RootElement.GetProperty("score").GetInt32();
            var feedback = resultDoc.RootElement.GetProperty("feedback").GetString() ?? "";

            return (Math.Clamp(score, 0, 1), feedback);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI grading failed for question: {Question}", questionText);
            throw;
        }
    }
}
