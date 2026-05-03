// OllamaGradingService.cs
// AI grading provider за локален Ollama сървър (http://localhost:11434).
// 100% безплатен, без rate limit, privacy-friendly (нищо не излиза от мрежата).
// Изисква: ollama pull <model> и работещ ollama сървър.
using System.Text;
using System.Text.Json;

namespace TestApp.Api.Services;

public class OllamaGradingService : IAiGradingService
{
    private readonly HttpClient _http;
    private readonly string _baseUrl;
    private readonly string _model;
    private readonly ILogger<OllamaGradingService> _logger;

    public OllamaGradingService(HttpClient http, IConfiguration config, ILogger<OllamaGradingService> logger)
    {
        _http = http;
        _baseUrl = (config["Ollama:BaseUrl"] ?? "http://localhost:11434").TrimEnd('/');
        _model = config["Ollama:Model"] ?? "llama3.1:8b";
        _logger = logger;

        // Ollama може да бъде бавна при cold start — увеличаваме timeout-а
        _http.Timeout = TimeSpan.FromMinutes(2);
    }

    public async Task<(int Score, string Feedback)> GradeAnswerAsync(
        string questionText, string? sampleAnswer, string studentAnswer, string questionType,
        int maxPoints = 1)
    {
        var systemPrompt = AiResponseParser.BuildSystemPrompt(questionType);
        var userPrompt   = AiResponseParser.BuildUserPrompt(questionText, sampleAnswer, studentAnswer, maxPoints);

        // Ollama /api/chat — OpenAI-compatible прокся, поддържа format=json
        var requestBody = new
        {
            model = _model,
            messages = new[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt }
            },
            stream = false,
            format = "json",  // принуждава JSON output
            options = new
            {
                temperature = 0.1,    // ниска температура за детерминирани оценки
                num_predict = 256     // лимит на output токените
            }
        };

        var json = JsonSerializer.Serialize(requestBody);
        var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/api/chat")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        try
        {
            var response = await _http.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var errBody = await response.Content.ReadAsStringAsync();
                _logger.LogError("Ollama API върна {StatusCode}: {Body}", response.StatusCode, errBody);
                response.EnsureSuccessStatusCode();
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);

            // Ollama format: { "message": { "content": "..." }, ... }
            var text = doc.RootElement
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "";

            var clean = AiResponseParser.CleanJson(text);

            using var resultDoc = JsonDocument.Parse(clean);
            var score    = resultDoc.RootElement.GetProperty("score").GetInt32();
            var feedback = resultDoc.RootElement.GetProperty("feedback").GetString() ?? "";

            return (Math.Clamp(score, 0, maxPoints), feedback);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex,
                "Ollama не е достъпен на {Url}. Уверете се че 'ollama serve' върви.",
                _baseUrl);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ollama AI grading failed for question: {Question}", questionText);
            throw;
        }
    }
}
