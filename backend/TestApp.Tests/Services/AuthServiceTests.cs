// Стъпка 36 — AuthServiceTests.cs
// Тестове за AuthService (регистрация, влизане, JWT)
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using TestApp.Api.Dtos.Auth;
using TestApp.Api.Models;
using TestApp.Api.Services;
using TestApp.Tests.Helpers;

namespace TestApp.Tests.Services;

public class AuthServiceTests : IDisposable
{
    private readonly TestDbContextFactory _factory;
    private readonly IConfiguration _config;

    public AuthServiceTests()
    {
        _factory = new TestDbContextFactory();

        // Конфигурация с тестов JWT ключ
        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SecretKey"] = JwtTestHelper.TestSecretKey,
                ["Jwt:Issuer"] = JwtTestHelper.TestIssuer,
                ["Jwt:Audience"] = JwtTestHelper.TestAudience,
                ["Jwt:ExpirationInHours"] = "1"
            })
            .Build();
    }

    // Помощен метод за създаване на AuthService
    private AuthService CreateService() =>
        new AuthService(_factory.CreateContext(), _config);

    // Тест: успешна регистрация връща токен и данни за потребителя
    [Fact]
    public async Task Register_WithValidData_ReturnsTokenAndUser()
    {
        // Arrange
        var service = CreateService();
        var request = new RegisterRequest
        {
            Email = "new@test.com",
            Password = "Password123!",
            FullName = "Нов Потребител"
        };

        // Act
        var result = await service.RegisterAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Token.Should().NotBeNullOrEmpty();
        result.User.Should().NotBeNull();
        result.User.Email.Should().Be("new@test.com");
        result.User.FullName.Should().Be("Нов Потребител");
        result.User.Id.Should().NotBe(Guid.Empty);
    }

    // Тест: регистрация с дублиран имейл хвърля InvalidOperationException
    [Fact]
    public async Task Register_WithDuplicateEmail_ThrowsInvalidOperationException()
    {
        // Arrange
        var db = _factory.CreateContext();
        db.Users.Add(new AppUser
        {
            Email = "existing@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Pass123!"),
            FullName = "Съществуващ"
        });
        await db.SaveChangesAsync();

        // Създава нов service с новия context (за да вижда saved потребителя)
        var service = new AuthService(db, _config);
        var request = new RegisterRequest
        {
            Email = "existing@test.com",
            Password = "Password123!",
            FullName = "Нов"
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.RegisterAsync(request));
    }

    // Тест: съобщението при дублиран имейл е на български
    [Fact]
    public async Task Register_WithDuplicateEmail_ErrorMessageIsInBulgarian()
    {
        // Arrange
        var db = _factory.CreateContext();
        db.Users.Add(new AppUser
        {
            Email = "dup@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Pass123!"),
            FullName = "Дублиран"
        });
        await db.SaveChangesAsync();

        var service = new AuthService(db, _config);
        var request = new RegisterRequest
        {
            Email = "dup@test.com",
            Password = "Password123!",
            FullName = "Нов"
        };

        // Act
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.RegisterAsync(request));

        // Assert
        ex.Message.Should().Be("Имейлът вече е регистриран.");
    }

    // Тест: успешен login
    [Fact]
    public async Task Login_WithValidCredentials_ReturnsTokenAndUser()
    {
        // Arrange
        var db = _factory.CreateContext();
        var userId = Guid.NewGuid();
        db.Users.Add(new AppUser
        {
            Id = userId,
            Email = "login@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
            FullName = "Логин Потребител"
        });
        await db.SaveChangesAsync();

        var service = new AuthService(db, _config);
        var request = new LoginRequest
        {
            Email = "login@test.com",
            Password = "Password123!"
        };

        // Act
        var result = await service.LoginAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Token.Should().NotBeNullOrEmpty();
        result.User.Email.Should().Be("login@test.com");
        result.User.Id.Should().Be(userId);
    }

    // Тест: login с грешна парола хвърля UnauthorizedAccessException
    [Fact]
    public async Task Login_WithWrongPassword_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var db = _factory.CreateContext();
        db.Users.Add(new AppUser
        {
            Email = "user@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("CorrectPass123!"),
            FullName = "Потребител"
        });
        await db.SaveChangesAsync();

        var service = new AuthService(db, _config);
        var request = new LoginRequest
        {
            Email = "user@test.com",
            Password = "WrongPassword!"
        };

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.LoginAsync(request));
    }

    // Тест: login с несъществуващ имейл хвърля UnauthorizedAccessException
    [Fact]
    public async Task Login_WithNonExistentEmail_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var service = CreateService();
        var request = new LoginRequest
        {
            Email = "nonexistent@test.com",
            Password = "Password123!"
        };

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.LoginAsync(request));
    }

    // Тест: PasswordHash е различен от оригиналната парола
    [Fact]
    public async Task Register_PasswordHashIsDifferentFromPlaintext()
    {
        // Arrange
        var db = _factory.CreateContext();
        var service = new AuthService(db, _config);
        string plainPassword = "MyPassword123!";
        var request = new RegisterRequest
        {
            Email = "hash@test.com",
            Password = plainPassword,
            FullName = "Хеш Потребител"
        };

        // Act
        await service.RegisterAsync(request);

        // Assert — хешът не трябва да е равен на оригиналната парола
        var user = db.Users.First(u => u.Email == "hash@test.com");
        user.PasswordHash.Should().NotBe(plainPassword);
        user.PasswordHash.Should().NotBeNullOrEmpty();
        // Проверява че е валиден BCrypt хеш
        BCrypt.Net.BCrypt.Verify(plainPassword, user.PasswordHash).Should().BeTrue();
    }

    // Тест: JWT токенът е валиден и съдържа userId
    [Fact]
    public async Task Register_JwtTokenContainsUserId()
    {
        // Arrange
        var db = _factory.CreateContext();
        var service = new AuthService(db, _config);
        var request = new RegisterRequest
        {
            Email = "jwt@test.com",
            Password = "Password123!",
            FullName = "JWT Потребител"
        };

        // Act
        var result = await service.RegisterAsync(request);

        // Assert — проверява JWT токена
        var handler = new JwtSecurityTokenHandler();
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(JwtTestHelper.TestSecretKey));

        var validationParams = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = JwtTestHelper.TestIssuer,
            ValidateAudience = true,
            ValidAudience = JwtTestHelper.TestAudience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = key,
            ValidateLifetime = true
        };

        var principal = handler.ValidateToken(
            result.Token, validationParams, out _);

        // Проверява userId в claims
        var userIdClaim = principal.FindFirst(
            System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        userIdClaim.Should().Be(result.User.Id.ToString());
    }

    public void Dispose() => _factory.Dispose();
}
