using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace TestApp.Api.Services;

public class GroqGradingService : IAiGradingService
{
    private readonly HttpClient _http;
    private readonly string _apiKey;
    private readonly string _model;
    private readonly ILogger<GroqGradingService> _logger;

    private const string GroqEndpoint = "https://api.groq.com/openai/v1/chat/completions";

    public GroqGradingService(HttpClient http, IConfiguration config, ILogger<GroqGradingService> logger)
    {
        _http = http;
        _apiKey = config["Groq:ApiKey"] ?? throw new InvalidOperationException("Groq:ApiKey not configured");
        _model = config["Groq:Model"] ?? "llama-3.1-8b-instant";
        _logger = logger;
    }

    public async Task<(int Score, string Feedback)> GradeAnswerAsync(
        string questionText, string? sampleAnswer, string studentAnswer, string questionType,
        int maxPoints = 1)
    {
        var systemPrompt = AiResponseParser.BuildSystemPrompt(questionType);
        var userPrompt   = AiResponseParser.BuildUserPrompt(questionText, sampleAnswer, studentAnswer, maxPoints);

        // OpenAI-compatible request body за Groq
        var requestBody = new
        {
            model = _model,
            messages = new[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt }
            },
            max_tokens = 256,
            response_format = new { type = "json_object" }
        };

        var json = JsonSerializer.Serialize(requestBody);
        var request = new HttpRequestMessage(HttpMethod.Post, GroqEndpoint)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

        try
        {
            var response = await _http.SendAsync(request);
            response.EnsureSuccessStatusCode();
            var responseJson = await response.Content.ReadAsStringAsync();

            using var doc = JsonDocument.Parse(responseJson);

            // Извлича content от choices[0].message.content
            var text = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
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
            _logger.LogError(ex, "Groq AI grading failed for question: {Question}", questionText);
            throw;
        }
    }

}
