// GroqGradingServiceTests.cs
// Unit тестове за GroqGradingService — TDD RED фаза

using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;
using System.Net;
using System.Text;
using System.Text.Json;
using TestApp.Api.Services;

namespace TestApp.Tests.Services;

public class GroqGradingServiceTests
{
    // -------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------

    private static GroqGradingService CreateService(
        HttpMessageHandler handler,
        string apiKey = "gsk_test",
        string model = "llama-3.1-8b-instant")
    {
        var httpClient = new HttpClient(handler);
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Groq:ApiKey"] = apiKey,
                ["Groq:Model"] = model
            })
            .Build();
        var logger = new Mock<ILogger<GroqGradingService>>().Object;
        return new GroqGradingService(httpClient, config, logger);
    }

    private static Mock<HttpMessageHandler> CreateMockHandler(
        HttpStatusCode statusCode,
        string responseBody)
    {
        var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = statusCode,
                Content = new StringContent(responseBody, Encoding.UTF8, "application/json")
            });
        return handlerMock;
    }

    private static string MakeGroqResponse(int score, string feedback) =>
        JsonSerializer.Serialize(new
        {
            choices = new[]
            {
                new
                {
                    message = new
                    {
                        content = JsonSerializer.Serialize(new { score, feedback })
                    }
                }
            }
        });

    // -------------------------------------------------------------------
    // Test 1: GradeAnswerAsync_SendsCorrectRequestBody
    // Проверява URL, Authorization header и структурата на тялото
    // -------------------------------------------------------------------

    [Fact]
    public async Task GradeAnswerAsync_SendsCorrectRequestBody()
    {
        // Arrange — използваме CapturingHandler за да уловим request-а
        var captureHandler = new CapturingHttpMessageHandler(
            HttpStatusCode.OK,
            MakeGroqResponse(2, "ok"));

        var service = CreateService(captureHandler, apiKey: "gsk_test");

        // Act
        await service.GradeAnswerAsync("Question?", "Sample answer", "Student answer", "Open", 3);

        // Assert — URL
        captureHandler.CapturedRequest.Should().NotBeNull();
        captureHandler.CapturedRequest!.RequestUri!.ToString()
            .Should().Be("https://api.groq.com/openai/v1/chat/completions");

        // Assert — Authorization header
        captureHandler.CapturedRequest.Headers.Authorization.Should().NotBeNull();
        captureHandler.CapturedRequest.Headers.Authorization!.Scheme.Should().Be("Bearer");
        captureHandler.CapturedRequest.Headers.Authorization.Parameter.Should().Be("gsk_test");

        // Assert — тяло
        captureHandler.CapturedBody.Should().NotBeNull();
        using var doc = JsonDocument.Parse(captureHandler.CapturedBody!);
        var root = doc.RootElement;

        root.GetProperty("model").GetString().Should().NotBeNullOrEmpty();

        var messages = root.GetProperty("messages");
        messages.GetArrayLength().Should().Be(2);
        messages[0].GetProperty("role").GetString().Should().Be("system");
        messages[1].GetProperty("role").GetString().Should().Be("user");

        root.GetProperty("max_tokens").GetInt32().Should().Be(256);

        var responseFormat = root.GetProperty("response_format");
        responseFormat.GetProperty("type").GetString().Should().Be("json_object");
    }

    // -------------------------------------------------------------------
    // Test 2: GradeAnswerAsync_ParsesGroqResponse
    // Стандартен успешен отговор се парси правилно
    // -------------------------------------------------------------------

    [Fact]
    public async Task GradeAnswerAsync_ParsesGroqResponse()
    {
        // Arrange
        var handler = CreateMockHandler(HttpStatusCode.OK, MakeGroqResponse(3, "good"));
        var service = CreateService(handler.Object);

        // Act
        var (score, feedback) = await service.GradeAnswerAsync(
            "Question?", null, "Student answer", "Open", 5);

        // Assert
        score.Should().Be(3);
        feedback.Should().Be("good");
    }

    // -------------------------------------------------------------------
    // Test 3: GradeAnswerAsync_ClampsScoreToMaxPoints
    // Score, по-голям от maxPoints, се ограничава до maxPoints
    // -------------------------------------------------------------------

    [Fact]
    public async Task GradeAnswerAsync_ClampsScoreToMaxPoints()
    {
        // Arrange — AI върна score=99, maxPoints=5
        var handler = CreateMockHandler(HttpStatusCode.OK, MakeGroqResponse(99, "too high"));
        var service = CreateService(handler.Object);

        // Act
        var (score, _) = await service.GradeAnswerAsync(
            "Question?", null, "Student answer", "Open", 5);

        // Assert
        score.Should().Be(5);
    }

    // -------------------------------------------------------------------
    // Test 4: GradeAnswerAsync_HandlesMarkdownFencedJson
    // Отговорът, обвит в ```json ... ```, се парси успешно
    // -------------------------------------------------------------------

    [Fact]
    public async Task GradeAnswerAsync_HandlesMarkdownFencedJson()
    {
        // Arrange — content е markdown fenced JSON
        var innerJson = JsonSerializer.Serialize(new { score = 4, feedback = "well done" });
        var markdownContent = $"```json\n{innerJson}\n```";

        var groqResponse = JsonSerializer.Serialize(new
        {
            choices = new[]
            {
                new { message = new { content = markdownContent } }
            }
        });

        var handler = CreateMockHandler(HttpStatusCode.OK, groqResponse);
        var service = CreateService(handler.Object);

        // Act
        var (score, feedback) = await service.GradeAnswerAsync(
            "Question?", null, "Student answer", "Open", 5);

        // Assert
        score.Should().Be(4);
        feedback.Should().Be("well done");
    }

    // -------------------------------------------------------------------
    // Test 5: GradeAnswerAsync_ThrowsOnHttpError
    // HTTP 500 от Groq → хвърля изключение
    // -------------------------------------------------------------------

    [Fact]
    public async Task GradeAnswerAsync_ThrowsOnHttpError()
    {
        // Arrange
        var handler = CreateMockHandler(HttpStatusCode.InternalServerError, "Internal Server Error");
        var service = CreateService(handler.Object);

        // Act & Assert
        var act = async () => await service.GradeAnswerAsync(
            "Question?", null, "Student answer", "Open", 5);

        await act.Should().ThrowAsync<Exception>();
    }
}

// -------------------------------------------------------------------
// CapturingHttpMessageHandler — улавя последния изпратен HttpRequestMessage
// -------------------------------------------------------------------

public class CapturingHttpMessageHandler : HttpMessageHandler
{
    private readonly HttpStatusCode _statusCode;
    private readonly string _responseBody;

    public HttpRequestMessage? CapturedRequest { get; private set; }
    public string? CapturedBody { get; private set; }

    public CapturingHttpMessageHandler(HttpStatusCode statusCode, string responseBody)
    {
        _statusCode = statusCode;
        _responseBody = responseBody;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        CapturedRequest = request;
        CapturedBody = request.Content is not null
            ? await request.Content.ReadAsStringAsync(cancellationToken)
            : null;

        return new HttpResponseMessage
        {
            StatusCode = _statusCode,
            Content = new StringContent(_responseBody, Encoding.UTF8, "application/json")
        };
    }
}
