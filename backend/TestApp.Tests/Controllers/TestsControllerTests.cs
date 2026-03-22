// Стъпка 39 — TestsControllerTests.cs
// Интеграционни тестове за TestsController (WebApplicationFactory)
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Api.Data;
using TestApp.Api.Dtos.Auth;
using TestApp.Api.Dtos.Tests;
using TestApp.Api.Models;
using TestApp.Tests.Helpers;

namespace TestApp.Tests.Controllers;

public class TestsControllerTests : IClassFixture<WebAppFactory>
{
    private readonly HttpClient _client;
    private readonly WebAppFactory _factory;

    public TestsControllerTests(WebAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    // Помощен метод за регистрация и получаване на JWT токен
    private async Task<string> GetAuthTokenAsync()
    {
        string email = $"ctrl_{Guid.NewGuid():N}@test.com";
        var registerResponse = await _client.PostAsJsonAsync(
            "/api/auth/register",
            new RegisterRequest
            {
                Email = email,
                Password = "TestPass123!",
                FullName = "Контролер Тест"
            });

        var authBody = await registerResponse.Content.ReadFromJsonAsync<AuthResponse>();
        return authBody!.Token;
    }

    // Помощен метод за създаване на Published тест директно в DB
    private async Task<Test> SeedPublishedTestAsync(
        Guid ownerId, string shareCode = "CTRLTEST")
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Проверява дали тестът вече съществува
        var existing = db.Tests.FirstOrDefault(t => t.ShareCode == shareCode);
        if (existing is not null)
        {
            return existing;
        }

        var question = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Тестов въпрос?",
            OrderIndex = 0,
            Answers = new List<Answer>
            {
                new() { Id = Guid.NewGuid(), Text = "Верен", IsCorrect = true, OrderIndex = 0 },
                new() { Id = Guid.NewGuid(), Text = "Грешен", IsCorrect = false, OrderIndex = 1 }
            }
        };

        var test = new Test
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            Title = "Контролер Тест",
            ShareCode = shareCode,
            Status = TestStatus.Published,
            Duration = 1800,
            Questions = new List<Question> { question }
        };

        db.Tests.Add(test);
        await db.SaveChangesAsync();
        return test;
    }

    // Тест: GET /api/tests без токен → 401
    [Fact]
    public async Task GetMyTests_WithoutToken_Returns401()
    {
        // Act
        var response = await _client.GetAsync("/api/tests");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // Тест: GET /api/tests с токен → 200
    [Fact]
    public async Task GetMyTests_WithToken_Returns200()
    {
        // Arrange
        string token = await GetAuthTokenAsync();
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.GetAsync("/api/tests");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // Почиства заглавката след теста
        _client.DefaultRequestHeaders.Authorization = null;
    }

    // Тест: POST /api/tests с токен → 201
    [Fact]
    public async Task CreateTest_WithToken_Returns201()
    {
        // Arrange
        string token = await GetAuthTokenAsync();
        var request = new CreateTestRequest
        {
            Title = "Нов API тест",
            Description = "Описание",
            Duration = 600,
            Questions = new List<CreateQuestionDto>
            {
                new()
                {
                    Text = "API въпрос?",
                    Answers = new List<CreateAnswerDto>
                    {
                        new() { Text = "Отговор", IsCorrect = true }
                    }
                }
            }
        };

        using var httpClient = _factory.CreateClient();
        httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await httpClient.PostAsJsonAsync("/api/tests", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var body = await response.Content.ReadFromJsonAsync<TestListItem>();
        body.Should().NotBeNull();
        body!.Title.Should().Be("Нов API тест");
        body.QuestionsCount.Should().Be(1);
    }

    // Тест: GET /api/tests/{shareCode} → 200 (public)
    [Fact]
    public async Task GetPublicTest_WithValidShareCode_Returns200()
    {
        // Arrange — създава потребител и Published тест
        string token = await GetAuthTokenAsync();

        // Извлича userId от токена
        var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);
        var userIdStr = jwtToken.Claims
            .First(c => c.Type == "nameid" || c.Type ==
                System.Security.Claims.ClaimTypes.NameIdentifier).Value;
        Guid userId = Guid.Parse(userIdStr);

        string shareCode = $"PUB{Guid.NewGuid():N}".Substring(0, 8).ToUpper();
        await SeedPublishedTestAsync(userId, shareCode);

        // Act — без автентикация (публичен endpoint)
        using var anonClient = _factory.CreateClient();
        var response = await anonClient.GetAsync($"/api/tests/{shareCode}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // Тест: GET /api/tests/{shareCode} response НЕ съдържа "isCorrect" в JSON body
    [Fact]
    public async Task GetPublicTest_ResponseBodyDoesNotContainIsCorrect()
    {
        // Arrange
        string token = await GetAuthTokenAsync();
        var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);
        var userIdStr = jwtToken.Claims
            .First(c => c.Type == "nameid" || c.Type ==
                System.Security.Claims.ClaimTypes.NameIdentifier).Value;
        Guid userId = Guid.Parse(userIdStr);

        string shareCode = $"NIC{Guid.NewGuid():N}".Substring(0, 8).ToUpper();
        await SeedPublishedTestAsync(userId, shareCode);

        // Act
        using var anonClient = _factory.CreateClient();
        var response = await anonClient.GetAsync($"/api/tests/{shareCode}");
        string jsonBody = await response.Content.ReadAsStringAsync();

        // Assert — JSON body не трябва да съдържа isCorrect
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        jsonBody.ToLower().Should().NotContain("iscorrect",
            because: "публичният отговор не трябва да разкрива верните отговори");
    }

    // Тест: GET /api/tests/{invalidCode} → 404
    [Fact]
    public async Task GetPublicTest_WithInvalidShareCode_Returns404()
    {
        // Act
        using var anonClient = _factory.CreateClient();
        var response = await anonClient.GetAsync("/api/tests/INVALID1");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // Тест: POST /api/tests/{shareCode}/attempts → 200 + score
    [Fact]
    public async Task SubmitAttempt_WithValidData_Returns200WithScore()
    {
        // Arrange
        string token = await GetAuthTokenAsync();
        var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);
        var userIdStr = jwtToken.Claims
            .First(c => c.Type == "nameid" || c.Type ==
                System.Security.Claims.ClaimTypes.NameIdentifier).Value;
        Guid userId = Guid.Parse(userIdStr);

        string shareCode = $"ATT{Guid.NewGuid():N}".Substring(0, 8).ToUpper();
        var test = await SeedPublishedTestAsync(userId, shareCode);

        // Взима въпроса и верния отговор
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var fullTest = db.Tests
            .Include(t => t.Questions)
            .ThenInclude(q => q.Answers)
            .First(t => t.ShareCode == shareCode);

        var question = fullTest.Questions.First();
        var correctAnswer = question.Answers.First(a => a.IsCorrect);

        var request = new SubmitAttemptRequest
        {
            ParticipantName = "API Ученик",
            Answers = new List<AttemptAnswerDto>
            {
                new() { QuestionId = question.Id, SelectedAnswerId = correctAnswer.Id }
            }
        };

        // Act
        using var anonClient = _factory.CreateClient();
        var response = await anonClient.PostAsJsonAsync(
            $"/api/tests/{shareCode}/attempts", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<AttemptResultResponse>();
        result.Should().NotBeNull();
        result!.Score.Should().Be(1);
        result.TotalQuestions.Should().Be(1);
    }

    // Тест: GET /api/tests/{id:guid} с токен → 200 (пълен изглед за учителя)
    [Fact]
    public async Task GetFullTest_WithOwnerToken_Returns200WithIsCorrect()
    {
        // Arrange
        string token = await GetAuthTokenAsync();
        var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);
        var userIdStr = jwtToken.Claims
            .First(c => c.Type == "nameid" || c.Type ==
                System.Security.Claims.ClaimTypes.NameIdentifier).Value;
        Guid userId = Guid.Parse(userIdStr);

        string shareCode = $"FUL{Guid.NewGuid():N}".Substring(0, 8).ToUpper();
        var test = await SeedPublishedTestAsync(userId, shareCode);

        using var authClient = _factory.CreateClient();
        authClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await authClient.GetAsync($"/api/tests/{test.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        string jsonBody = await response.Content.ReadAsStringAsync();
        // Пълният изглед за учителя ТРЯБВА да съдържа isCorrect
        jsonBody.ToLower().Should().Contain("iscorrect");
    }

    // Тест: GET /api/tests/{nonExistentId:guid} с токен → 404
    [Fact]
    public async Task GetFullTest_WithNonExistentId_Returns404()
    {
        // Arrange
        string token = await GetAuthTokenAsync();
        using var authClient = _factory.CreateClient();
        authClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await authClient.GetAsync($"/api/tests/{Guid.NewGuid()}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // Тест: POST /api/tests/{shareCode}/attempts за несъществуващ тест → 404
    [Fact]
    public async Task SubmitAttempt_WithInvalidShareCode_Returns404()
    {
        // Arrange
        var request = new SubmitAttemptRequest
        {
            ParticipantName = "Ученик",
            Answers = new List<AttemptAnswerDto>()
        };

        // Act
        using var anonClient = _factory.CreateClient();
        var response = await anonClient.PostAsJsonAsync(
            "/api/tests/NOTFOUND/attempts", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
