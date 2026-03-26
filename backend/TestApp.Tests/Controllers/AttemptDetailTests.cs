// AttemptDetailTests.cs
// Интеграционни тестове за GET api/tests/{testId}/attempts/{attemptId}
// и POST api/tests/{testId}/attempts/{attemptId}/grade

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
using TestApp.Api.Models.Enums;
using TestApp.Tests.Helpers;

namespace TestApp.Tests.Controllers;

public class AttemptDetailTests : IClassFixture<WebAppFactory>
{
    private readonly HttpClient _client;
    private readonly WebAppFactory _factory;

    public AttemptDetailTests(WebAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    // -------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------

    private async Task<(string Token, Guid UserId)> GetAuthTokenWithIdAsync(string? emailPrefix = null)
    {
        string email = $"{emailPrefix ?? "detail"}_{Guid.NewGuid():N}@test.com";
        var registerResponse = await _client.PostAsJsonAsync(
            "/api/auth/register",
            new RegisterRequest
            {
                Email = email,
                Password = "TestPass123!",
                FullName = "Detail Test"
            });

        var authBody = await registerResponse.Content.ReadFromJsonAsync<AuthResponse>();
        var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(authBody!.Token);
        var userIdStr = jwtToken.Claims
            .First(c => c.Type == "nameid" || c.Type ==
                System.Security.Claims.ClaimTypes.NameIdentifier).Value;

        return (authBody.Token, Guid.Parse(userIdStr));
    }

    private async Task<(Test test, Attempt attempt)> SeedTestWithAttemptAsync(Guid ownerId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        string shareCode = $"DT{Guid.NewGuid():N}".Substring(0, 8).ToUpper();

        var closedAnswerId = Guid.NewGuid();
        var closedQuestion = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Кое е вярно?",
            Type = "Closed",
            OrderIndex = 0,
            Answers = new List<Answer>
            {
                new() { Id = closedAnswerId, Text = "Верен", IsCorrect = true, OrderIndex = 0 },
                new() { Id = Guid.NewGuid(), Text = "Грешен", IsCorrect = false, OrderIndex = 1 }
            }
        };

        var openQuestion = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Обяснете концепцията.",
            Type = "Open",
            OrderIndex = 1,
            SampleAnswer = "Примерен отговор"
        };

        var test = new Test
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            Title = "Тест за Detail",
            ShareCode = shareCode,
            Status = TestStatus.Published,
            Duration = 600,
            Questions = new List<Question> { closedQuestion, openQuestion }
        };

        var attempt = new Attempt
        {
            Id = Guid.NewGuid(),
            TestId = test.Id,
            ParticipantName = "Петър Тестов",
            Score = 1,
            TotalQuestions = 1,
            CreatedAt = DateTime.UtcNow,
            AttemptAnswers = new List<AttemptAnswer>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    QuestionId = closedQuestion.Id,
                    SelectedAnswerId = closedAnswerId,
                    IsCorrect = true,
                    GradingStatus = GradingStatus.NotApplicable
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    QuestionId = openQuestion.Id,
                    OpenText = "Студентски отговор",
                    IsCorrect = false,
                    GradingStatus = GradingStatus.Pending
                }
            }
        };

        db.Tests.Add(test);
        db.Attempts.Add(attempt);
        await db.SaveChangesAsync();

        return (test, attempt);
    }

    private HttpClient CreateAuthClient(string token)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    // -------------------------------------------------------------------
    // GET /api/tests/{testId}/attempts/{attemptId} — authentication
    // -------------------------------------------------------------------

    [Fact]
    public async Task GetAttemptDetail_Returns401_WhenNotAuthenticated()
    {
        // Act
        var response = await _client.GetAsync(
            $"/api/tests/{Guid.NewGuid()}/attempts/{Guid.NewGuid()}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // -------------------------------------------------------------------
    // GET /api/tests/{testId}/attempts/{attemptId} — ownership
    // -------------------------------------------------------------------

    [Fact]
    public async Task GetAttemptDetail_Returns404_WhenTestNotOwned()
    {
        // Arrange
        var (ownerToken, ownerId) = await GetAuthTokenWithIdAsync("owner_ad");
        var (test, attempt) = await SeedTestWithAttemptAsync(ownerId);

        var (otherToken, _) = await GetAuthTokenWithIdAsync("other_ad");
        using var authClient = CreateAuthClient(otherToken);

        // Act
        var response = await authClient.GetAsync(
            $"/api/tests/{test.Id}/attempts/{attempt.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetAttemptDetail_Returns404_WhenAttemptNotFound()
    {
        // Arrange
        var (token, ownerId) = await GetAuthTokenWithIdAsync("adnf");
        var (test, _) = await SeedTestWithAttemptAsync(ownerId);
        using var authClient = CreateAuthClient(token);

        // Act
        var response = await authClient.GetAsync(
            $"/api/tests/{test.Id}/attempts/{Guid.NewGuid()}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // -------------------------------------------------------------------
    // GET /api/tests/{testId}/attempts/{attemptId} — happy path
    // -------------------------------------------------------------------

    [Fact]
    public async Task GetAttemptDetail_Returns200_WithCorrectParticipantName()
    {
        // Arrange
        var (token, ownerId) = await GetAuthTokenWithIdAsync("adname");
        var (test, attempt) = await SeedTestWithAttemptAsync(ownerId);
        using var authClient = CreateAuthClient(token);

        // Act
        var response = await authClient.GetAsync(
            $"/api/tests/{test.Id}/attempts/{attempt.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AttemptDetailResponse>();
        body.Should().NotBeNull();
        body!.ParticipantName.Should().Be("Петър Тестов");
    }

    [Fact]
    public async Task GetAttemptDetail_Returns200_WithTwoQuestions()
    {
        // Arrange
        var (token, ownerId) = await GetAuthTokenWithIdAsync("adq");
        var (test, attempt) = await SeedTestWithAttemptAsync(ownerId);
        using var authClient = CreateAuthClient(token);

        // Act
        var response = await authClient.GetAsync(
            $"/api/tests/{test.Id}/attempts/{attempt.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AttemptDetailResponse>();
        body!.Questions.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetAttemptDetail_Returns200_HasOpenAnswersTrue()
    {
        // Arrange
        var (token, ownerId) = await GetAuthTokenWithIdAsync("adopen");
        var (test, attempt) = await SeedTestWithAttemptAsync(ownerId);
        using var authClient = CreateAuthClient(token);

        // Act
        var response = await authClient.GetAsync(
            $"/api/tests/{test.Id}/attempts/{attempt.Id}");

        // Assert
        var body = await response.Content.ReadFromJsonAsync<AttemptDetailResponse>();
        body!.HasOpenAnswers.Should().BeTrue();
        body.AllGraded.Should().BeFalse();
    }

    [Fact]
    public async Task GetAttemptDetail_ClosedQuestion_HasAnswerDetails()
    {
        // Arrange
        var (token, ownerId) = await GetAuthTokenWithIdAsync("adclosed");
        var (test, attempt) = await SeedTestWithAttemptAsync(ownerId);
        using var authClient = CreateAuthClient(token);

        // Act
        var response = await authClient.GetAsync(
            $"/api/tests/{test.Id}/attempts/{attempt.Id}");

        // Assert
        var body = await response.Content.ReadFromJsonAsync<AttemptDetailResponse>();
        var closedQ = body!.Questions.First(q => q.QuestionType == "Closed");
        closedQ.Answers.Should().HaveCount(2);
        closedQ.Answers.Should().Contain(a => a.WasSelected && a.IsCorrect);
    }

    // -------------------------------------------------------------------
    // POST /api/tests/{testId}/attempts/{attemptId}/grade
    // -------------------------------------------------------------------

    [Fact]
    public async Task GradeAttempt_Returns401_WhenNotAuthenticated()
    {
        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/tests/{Guid.NewGuid()}/attempts/{Guid.NewGuid()}/grade", new { });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GradeAttempt_Returns404_WhenTestNotOwned()
    {
        // Arrange
        var (ownerToken, ownerId) = await GetAuthTokenWithIdAsync("grade_owner");
        var (test, attempt) = await SeedTestWithAttemptAsync(ownerId);

        var (otherToken, _) = await GetAuthTokenWithIdAsync("grade_other");
        using var authClient = CreateAuthClient(otherToken);

        // Act
        var response = await authClient.PostAsJsonAsync(
            $"/api/tests/{test.Id}/attempts/{attempt.Id}/grade", new { });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GradeAttempt_Returns200_WithSuccessMessage()
    {
        // Arrange — AI service not configured, so Pending → Failed (still returns 200)
        var (token, ownerId) = await GetAuthTokenWithIdAsync("grade_ok");
        var (test, attempt) = await SeedTestWithAttemptAsync(ownerId);
        using var authClient = CreateAuthClient(token);

        // Act
        var response = await authClient.PostAsJsonAsync(
            $"/api/tests/{test.Id}/attempts/{attempt.Id}/grade", new { });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        body.GetProperty("message").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task GradeAttempt_Returns404_WhenAttemptNotFound()
    {
        // Arrange
        var (token, ownerId) = await GetAuthTokenWithIdAsync("grade_anf");
        var (test, _) = await SeedTestWithAttemptAsync(ownerId);
        using var authClient = CreateAuthClient(token);

        // Act
        var response = await authClient.PostAsJsonAsync(
            $"/api/tests/{test.Id}/attempts/{Guid.NewGuid()}/grade", new { });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
