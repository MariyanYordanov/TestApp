// Стъпка 38 — AuthControllerTests.cs
// Интеграционни тестове за AuthController (WebApplicationFactory)
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using TestApp.Api.Dtos.Auth;
using TestApp.Tests.Helpers;

namespace TestApp.Tests.Controllers;

public class AuthControllerTests : IClassFixture<WebAppFactory>
{
    private readonly HttpClient _client;

    public AuthControllerTests(WebAppFactory factory)
    {
        _client = factory.CreateClient();
    }

    // Тест: POST /api/auth/register → 201 Created
    [Fact]
    public async Task Register_WithValidData_Returns201()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = $"newuser_{Guid.NewGuid():N}@test.com",
            Password = "Password123!",
            FullName = "Нов Потребител"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/register", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var body = await response.Content.ReadFromJsonAsync<AuthResponse>();
        body.Should().NotBeNull();
        body!.Token.Should().NotBeNullOrEmpty();
        body.User.Email.Should().Be(request.Email);
    }

    // Тест: POST /api/auth/register с дублиран email → 400
    [Fact]
    public async Task Register_WithDuplicateEmail_Returns400()
    {
        // Arrange — регистрира потребителя за пръв път
        string email = $"dup_{Guid.NewGuid():N}@test.com";
        var firstRequest = new RegisterRequest
        {
            Email = email,
            Password = "Password123!",
            FullName = "Дублиран Потребител"
        };

        await _client.PostAsJsonAsync("/api/auth/register", firstRequest);

        // Опит за регистрация с вече съществуващ имейл
        var duplicateRequest = new RegisterRequest
        {
            Email = email,
            Password = "AnotherPass123!",
            FullName = "Друго Ime"
        };

        // Act
        var response = await _client.PostAsJsonAsync(
            "/api/auth/register", duplicateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // Тест: POST /api/auth/register с невалиден request (липсва парола) → 400
    [Fact]
    public async Task Register_WithInvalidRequest_Returns400()
    {
        // Arrange — невалиден request без парола
        var invalidRequest = new
        {
            Email = "invalid@test.com",
            FullName = "Невалиден"
            // Password липсва
        };

        // Act
        var response = await _client.PostAsJsonAsync(
            "/api/auth/register", invalidRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // Тест: POST /api/auth/login → 200 + token
    [Fact]
    public async Task Login_WithValidCredentials_Returns200WithToken()
    {
        // Arrange — регистрира потребителя
        string email = $"login_{Guid.NewGuid():N}@test.com";
        string password = "LoginPass123!";

        await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Email = email,
            Password = password,
            FullName = "Логин Потребител"
        });

        var loginRequest = new LoginRequest
        {
            Email = email,
            Password = password
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<AuthResponse>();
        body.Should().NotBeNull();
        body!.Token.Should().NotBeNullOrEmpty();
    }

    // Тест: POST /api/auth/login с грешна парола → 401
    [Fact]
    public async Task Login_WithWrongPassword_Returns401()
    {
        // Arrange — регистрира потребителя
        string email = $"wrongpass_{Guid.NewGuid():N}@test.com";

        await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Email = email,
            Password = "CorrectPass123!",
            FullName = "Грешна Парола"
        });

        var loginRequest = new LoginRequest
        {
            Email = email,
            Password = "WrongPassword!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
