// Стъпка 36 — GetAttemptsTests.cs
// Интеграционни тестове за GET api/tests/{id}/attempts
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Api.Data;
using TestApp.Api.Dtos.Auth;
using TestApp.Api.Dtos.Tests;
using TestApp.Api.Models;
using TestApp.Tests.Helpers;

namespace TestApp.Tests.Controllers;

public class GetAttemptsTests : IClassFixture<WebAppFactory>
{
    private readonly HttpClient _client;
    private readonly WebAppFactory _factory;

    public GetAttemptsTests(WebAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    // Помощен метод за регистрация и получаване на JWT токен
    private async Task<(string Token, Guid UserId)> GetAuthTokenWithIdAsync()
    {
        string email = $"att_{Guid.NewGuid():N}@test.com";
        var registerResponse = await _client.PostAsJsonAsync(
            "/api/auth/register",
            new RegisterRequest
            {
                Email = email,
                Password = "TestPass123!",
                FullName = "Опит Тест"
            });

        var authBody = await registerResponse.Content.ReadFromJsonAsync<AuthResponse>();
        var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(authBody!.Token);
        var userIdStr = jwtToken.Claims
            .First(c => c.Type == "nameid" || c.Type ==
                System.Security.Claims.ClaimTypes.NameIdentifier).Value;

        return (authBody.Token, Guid.Parse(userIdStr));
    }

    // Помощен метод за създаване на тест директно в DB
    private async Task<Test> SeedTestAsync(Guid ownerId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        string shareCode = $"GA{Guid.NewGuid():N}".Substring(0, 8).ToUpper();

        var question = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Опит въпрос?",
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
            Title = "Тест за Опити",
            ShareCode = shareCode,
            Status = TestStatus.Published,
            Duration = 600,
            Questions = new List<Question> { question }
        };

        db.Tests.Add(test);
        await db.SaveChangesAsync();
        return test;
    }

    // Помощен метод за добавяне на опит за тест директно в DB
    private async Task<Attempt> SeedAttemptAsync(Guid testId, string participantName, int score, int totalQuestions)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var attempt = new Attempt
        {
            Id = Guid.NewGuid(),
            TestId = testId,
            ParticipantName = participantName,
            Score = score,
            TotalQuestions = totalQuestions,
            CreatedAt = DateTime.UtcNow
        };

        db.Attempts.Add(attempt);
        await db.SaveChangesAsync();
        return attempt;
    }

    // Тест: GET /api/tests/{id}/attempts без токен → 401
    [Fact]
    public async Task GetAttempts_Returns401_WhenNotAuthenticated()
    {
        // Act
        using var anonClient = _factory.CreateClient();
        var response = await anonClient.GetAsync($"/api/tests/{Guid.NewGuid()}/attempts");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // Тест: GET /api/tests/{id}/attempts за тест без опити → 200 + празен списък
    [Fact]
    public async Task GetAttempts_Returns200_WithEmptyList_WhenNoAttempts()
    {
        // Arrange
        var (token, userId) = await GetAuthTokenWithIdAsync();
        var test = await SeedTestAsync(userId);

        using var authClient = _factory.CreateClient();
        authClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await authClient.GetAsync($"/api/tests/{test.Id}/attempts");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<List<AttemptSummary>>();
        body.Should().NotBeNull();
        body.Should().BeEmpty();
    }

    // Тест: GET /api/tests/{id}/attempts за тест с опити → 200 + списък с опитите
    [Fact]
    public async Task GetAttempts_Returns200_WithAttempts_WhenTestHasAttempts()
    {
        // Arrange
        var (token, userId) = await GetAuthTokenWithIdAsync();
        var test = await SeedTestAsync(userId);
        await SeedAttemptAsync(test.Id, "Иван Иванов", 3, 5);
        await SeedAttemptAsync(test.Id, "Мария Петрова", 5, 5);

        using var authClient = _factory.CreateClient();
        authClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await authClient.GetAsync($"/api/tests/{test.Id}/attempts");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<List<AttemptSummary>>();
        body.Should().NotBeNull();
        body.Should().HaveCount(2);
        body.Should().Contain(a => a.ParticipantName == "Иван Иванов" && a.Score == 3 && a.TotalQuestions == 5);
        body.Should().Contain(a => a.ParticipantName == "Мария Петрова" && a.Score == 5 && a.TotalQuestions == 5);
    }

    // Тест: GET /api/tests/{id}/attempts за тест на друг потребител → 200 + празен списък (по сигурност)
    [Fact]
    public async Task GetAttempts_Returns200_WithEmptyList_WhenTestNotOwnedByUser()
    {
        // Arrange — създава тест за потребител 1
        var (_, ownerUserId) = await GetAuthTokenWithIdAsync();
        var test = await SeedTestAsync(ownerUserId);
        await SeedAttemptAsync(test.Id, "Участник", 2, 4);

        // Влиза като потребител 2
        var (otherToken, _) = await GetAuthTokenWithIdAsync();
        using var authClient = _factory.CreateClient();
        authClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", otherToken);

        // Act
        var response = await authClient.GetAsync($"/api/tests/{test.Id}/attempts");

        // Assert — празен списък, не 403/404, за да не се разкрива съществуването на теста
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<List<AttemptSummary>>();
        body.Should().NotBeNull();
        body.Should().BeEmpty();
    }

    // Тест: Percent се изчислява правилно (60.00 за 3 от 5)
    [Fact]
    public async Task GetAttempts_ReturnsCorrectPercent()
    {
        // Arrange
        var (token, userId) = await GetAuthTokenWithIdAsync();
        var test = await SeedTestAsync(userId);
        await SeedAttemptAsync(test.Id, "Процент Тест", 3, 5);

        using var authClient = _factory.CreateClient();
        authClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await authClient.GetAsync($"/api/tests/{test.Id}/attempts");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<List<AttemptSummary>>();
        body.Should().NotBeNull();
        body.Should().HaveCount(1);
        body![0].Percent.Should().Be(60.0);
    }
}
