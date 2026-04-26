using System.Text;
using System.Text.Json;

namespace TestApp.Api.Services;

public class AnthropicGradingService : IAiGradingService
{
    private readonly HttpClient _http;
    private readonly string _apiKey;
    private readonly ILogger<AnthropicGradingService> _logger;

    public AnthropicGradingService(HttpClient http, IConfiguration config, ILogger<AnthropicGradingService> logger)
    {
        _http = http;
        _apiKey = config["Anthropic:ApiKey"] ?? throw new InvalidOperationException("Anthropic:ApiKey not configured");
        _logger = logger;
    }

    public async Task<(int Score, string Feedback)> GradeAnswerAsync(
        string questionText, string? sampleAnswer, string studentAnswer, string questionType,
        int maxPoints = 1)
    {
        var systemPrompt = AiResponseParser.BuildSystemPrompt(questionType);
        var userPrompt   = AiResponseParser.BuildUserPrompt(questionText, sampleAnswer, studentAnswer, maxPoints);

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

            // Изчиства markdown/brace артефакти и извлича чист JSON
            var clean = AiResponseParser.CleanJson(text);

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
