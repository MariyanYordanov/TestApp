// TestServiceVoidAttemptTests.cs
// RED тестове за VoidAttemptAsync — Phase 2.C
// 4 теста: успешен void, вече voided, не е намерен, не е owner
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TestApp.Api.Models;
using TestApp.Api.Services;
using TestApp.Tests.Helpers;

namespace TestApp.Tests.Services;

public class TestServiceVoidAttemptTests : IDisposable
{
    private readonly TestDbContextFactory _factory;
    private readonly Guid _ownerId = Guid.NewGuid();

    public TestServiceVoidAttemptTests()
    {
        _factory = new TestDbContextFactory();
    }

    public void Dispose() => _factory.Dispose();

    private async Task SeedUserAsync()
    {
        var db = _factory.CreateContext();
        if (!db.Users.Any(u => u.Id == _ownerId))
        {
            db.Users.Add(new AppUser
            {
                Id = _ownerId,
                Email = "void@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Pass123!"),
                FullName = "Void Test User"
            });
            await db.SaveChangesAsync();
        }
    }

    private (TestService service, TestApp.Api.Data.AppDbContext db) CreateService()
    {
        var db = _factory.CreateContext();
        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen);
        return (service, db);
    }

    // Помощен метод — създава тест и опит за тестване
    private async Task<(Test test, Attempt attempt)> SeedTestWithAttemptAsync(bool isVoided = false)
    {
        await SeedUserAsync();
        var db = _factory.CreateContext();

        var question = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Въпрос?",
            Type = "Closed",
            Points = 1,
            OrderIndex = 0,
            Answers = new List<Answer>
            {
                new() { Id = Guid.NewGuid(), Text = "Верен", IsCorrect = true, OrderIndex = 0 }
            }
        };

        var test = new Test
        {
            Id = Guid.NewGuid(),
            Title = "Void Тест",
            Duration = 1800,
            Status = TestStatus.Published,
            ShareCode = $"VD{Guid.NewGuid():N}"[..8].ToUpper(),
            OwnerId = _ownerId,
            RequireEmailGate = true,
            Questions = new List<Question> { question }
        };

        var attempt = new Attempt
        {
            Id = Guid.NewGuid(),
            TestId = test.Id,
            ParticipantName = "Ученик",
            ParticipantEmail = "student@school.bg",
            Score = 0,
            TotalQuestions = 1,
            CreatedAt = DateTime.UtcNow,
            IsVoided = isVoided
        };

        db.Tests.Add(test);
        db.Attempts.Add(attempt);
        await db.SaveChangesAsync();

        return (test, attempt);
    }

    // --- Тест 1: Успешен void — IsVoided=true, опитът не е изтрит ---
    [Fact]
    public async Task VoidAttemptAsync_Success_SetsIsVoidedTrue()
    {
        // Arrange
        var (test, attempt) = await SeedTestWithAttemptAsync();
        var (service, db) = CreateService();

        // Act
        var result = await service.VoidAttemptAsync(test.Id, attempt.Id, _ownerId);

        // Assert
        result.Should().BeTrue();
        var updated = db.Attempts.First(a => a.Id == attempt.Id);
        updated.IsVoided.Should().BeTrue();
        // Опитът не е изтрит — запазен за audit
        db.Attempts.Any(a => a.Id == attempt.Id).Should().BeTrue();
    }

    // --- Тест 2: Опит не е намерен → false ---
    [Fact]
    public async Task VoidAttemptAsync_AttemptNotFound_ReturnsFalse()
    {
        // Arrange
        var (test, _) = await SeedTestWithAttemptAsync();
        var (service, _) = CreateService();

        // Act
        var result = await service.VoidAttemptAsync(test.Id, Guid.NewGuid(), _ownerId);

        // Assert
        result.Should().BeFalse();
    }

    // --- Тест 3: Тестът не принадлежи на ownerId → false ---
    [Fact]
    public async Task VoidAttemptAsync_WrongOwner_ReturnsFalse()
    {
        // Arrange
        var (test, attempt) = await SeedTestWithAttemptAsync();
        var (service, _) = CreateService();
        var otherOwner = Guid.NewGuid();

        // Act
        var result = await service.VoidAttemptAsync(test.Id, attempt.Id, otherOwner);

        // Assert
        result.Should().BeFalse();
    }

    // --- Тест 4: Вече voided опит → може да бъде void-нат отново (idempotent) ---
    [Fact]
    public async Task VoidAttemptAsync_AlreadyVoided_ReturnsTrue_Idempotent()
    {
        // Arrange
        var (test, attempt) = await SeedTestWithAttemptAsync(isVoided: true);
        var (service, _) = CreateService();

        // Act
        var result = await service.VoidAttemptAsync(test.Id, attempt.Id, _ownerId);

        // Assert — idempotent, без грешка
        result.Should().BeTrue();
    }
}
