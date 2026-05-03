// OllamaGradingServiceTests.cs
// Unit тестове за локалния Ollama provider (mocked HttpClient).
using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using TestApp.Api.Services;
using Xunit;

namespace TestApp.Tests.Services;

public class OllamaGradingServiceTests
{
    private static IConfiguration BuildConfig(string? baseUrl = null, string? model = null)
    {
        var dict = new Dictionary<string, string?>
        {
            ["Ollama:BaseUrl"] = baseUrl ?? "http://localhost:11434",
            ["Ollama:Model"] = model ?? "llama3.1:8b",
        };
        return new ConfigurationBuilder().AddInMemoryCollection(dict).Build();
    }

    [Fact]
    public async Task GradeAnswerAsync_SendsCorrectRequestBody()
    {
        var ollamaResponse = """
            {
              "model": "llama3.1:8b",
              "message": { "role": "assistant", "content": "{\"score\": 3, \"feedback\": \"добре\"}" },
              "done": true
            }
            """;
        var captureHandler = new CapturingHttpMessageHandler(HttpStatusCode.OK, ollamaResponse);
        var http = new HttpClient(captureHandler);

        var service = new OllamaGradingService(http, BuildConfig(), NullLogger<OllamaGradingService>.Instance);
        await service.GradeAnswerAsync("Q?", "sample", "answer", "Open", maxPoints: 4);

        Assert.NotNull(captureHandler.CapturedRequest);
        Assert.Equal("http://localhost:11434/api/chat", captureHandler.CapturedRequest!.RequestUri!.ToString());
        Assert.NotNull(captureHandler.CapturedBody);

        using var doc = JsonDocument.Parse(captureHandler.CapturedBody!);
        var root = doc.RootElement;
        Assert.Equal("llama3.1:8b", root.GetProperty("model").GetString());
        Assert.False(root.GetProperty("stream").GetBoolean());
        Assert.Equal("json", root.GetProperty("format").GetString());

        var messages = root.GetProperty("messages");
        Assert.Equal(2, messages.GetArrayLength());
        Assert.Equal("system", messages[0].GetProperty("role").GetString());
        Assert.Equal("user", messages[1].GetProperty("role").GetString());
    }

    [Fact]
    public async Task GradeAnswerAsync_ParsesOllamaResponse()
    {
        var ollamaResponse = """
            {
              "message": { "content": "{\"score\": 2, \"feedback\": \"частично\"}" }
            }
            """;
        var http = new HttpClient(new CapturingHttpMessageHandler(HttpStatusCode.OK, ollamaResponse));
        var service = new OllamaGradingService(http, BuildConfig(), NullLogger<OllamaGradingService>.Instance);

        var (score, feedback) = await service.GradeAnswerAsync("Q?", "sample", "answer", "Open", maxPoints: 3);

        Assert.Equal(2, score);
        Assert.Equal("частично", feedback);
    }

    [Fact]
    public async Task GradeAnswerAsync_ClampsScoreToMaxPoints()
    {
        var ollamaResponse = """
            {
              "message": { "content": "{\"score\": 99, \"feedback\": \"опит за overflow\"}" }
            }
            """;
        var http = new HttpClient(new CapturingHttpMessageHandler(HttpStatusCode.OK, ollamaResponse));
        var service = new OllamaGradingService(http, BuildConfig(), NullLogger<OllamaGradingService>.Instance);

        var (score, _) = await service.GradeAnswerAsync("Q?", "sample", "answer", "Open", maxPoints: 5);

        Assert.Equal(5, score); // clamped към maxPoints
    }

    [Fact]
    public async Task GradeAnswerAsync_HandlesMarkdownFencedJson()
    {
        var ollamaResponse = """
            {
              "message": { "content": "```json\n{\"score\": 4, \"feedback\": \"перфектно\"}\n```" }
            }
            """;
        var http = new HttpClient(new CapturingHttpMessageHandler(HttpStatusCode.OK, ollamaResponse));
        var service = new OllamaGradingService(http, BuildConfig(), NullLogger<OllamaGradingService>.Instance);

        var (score, feedback) = await service.GradeAnswerAsync("Q?", "sample", "answer", "Code", maxPoints: 4);

        Assert.Equal(4, score);
        Assert.Equal("перфектно", feedback);
    }

    [Fact]
    public async Task GradeAnswerAsync_ThrowsOnHttpError()
    {
        var http = new HttpClient(new CapturingHttpMessageHandler(HttpStatusCode.InternalServerError, "{}"));
        var service = new OllamaGradingService(http, BuildConfig(), NullLogger<OllamaGradingService>.Instance);

        await Assert.ThrowsAsync<HttpRequestException>(async () =>
            await service.GradeAnswerAsync("Q?", "sample", "answer", "Open", maxPoints: 4));
    }

    [Fact]
    public async Task GradeAnswerAsync_UsesConfiguredModel()
    {
        var ollamaResponse = """
            {"message":{"content":"{\"score\":1,\"feedback\":\"ok\"}"}}
            """;
        var captureHandler = new CapturingHttpMessageHandler(HttpStatusCode.OK, ollamaResponse);
        var http = new HttpClient(captureHandler);

        var service = new OllamaGradingService(
            http,
            BuildConfig(model: "qwen2.5:3b"),
            NullLogger<OllamaGradingService>.Instance);

        await service.GradeAnswerAsync("Q?", null, "answer", "Open");

        using var doc = JsonDocument.Parse(captureHandler.CapturedBody!);
        Assert.Equal("qwen2.5:3b", doc.RootElement.GetProperty("model").GetString());
    }

    [Fact]
    public async Task GradeAnswerAsync_UsesConfiguredBaseUrl()
    {
        var ollamaResponse = """
            {"message":{"content":"{\"score\":1,\"feedback\":\"ok\"}"}}
            """;
        var captureHandler = new CapturingHttpMessageHandler(HttpStatusCode.OK, ollamaResponse);
        var http = new HttpClient(captureHandler);

        var service = new OllamaGradingService(
            http,
            BuildConfig(baseUrl: "http://my-ollama:8080/"),  // trailing slash → trimmed
            NullLogger<OllamaGradingService>.Instance);

        await service.GradeAnswerAsync("Q?", null, "answer", "Open");

        Assert.Equal("http://my-ollama:8080/api/chat",
            captureHandler.CapturedRequest!.RequestUri!.ToString());
    }
}
