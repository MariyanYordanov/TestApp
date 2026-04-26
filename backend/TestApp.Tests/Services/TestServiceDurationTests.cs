// TDD RED — TestServiceDurationTests.cs
// Тестове за валидация на продължителността (Duration) в TestService
using FluentAssertions;
using TestApp.Api.Dtos.Tests;
using TestApp.Api.Models;
using TestApp.Api.Services;
using TestApp.Tests.Helpers;

namespace TestApp.Tests.Services;

public class TestServiceDurationTests : IDisposable
{
    private readonly TestDbContextFactory _factory;
    private readonly Guid _ownerId = Guid.NewGuid();

    public TestServiceDurationTests()
    {
        _factory = new TestDbContextFactory();
    }

    private (TestService service, TestApp.Api.Data.AppDbContext db) CreateService()
    {
        var db = _factory.CreateContext();
        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen);
        return (service, db);
    }

    private async Task SeedUserAsync()
    {
        var db = _factory.CreateContext();
        if (!db.Users.Any(u => u.Id == _ownerId))
        {
            db.Users.Add(new AppUser
            {
                Id = _ownerId,
                Email = "duration-owner@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Pass123!"),
                FullName = "Duration Test Owner"
            });
            await db.SaveChangesAsync();
        }
    }

    // Помощен метод: строи минимален валиден заявка с 1 въпрос
    private static CreateTestRequest BuildMinimalRequest(int duration = 1800) =>
        new()
        {
            Title = "Тест за продължителност",
            Description = "Описание",
            Duration = duration,
            Questions = new List<CreateQuestionDto>
            {
                new()
                {
                    Text = "Въпрос?",
                    Answers = new List<CreateAnswerDto>
                    {
                        new() { Text = "Верен", IsCorrect = true },
                        new() { Text = "Грешен", IsCorrect = false },
                    }
                }
            }
        };

    // ---------------------------------------------------------------------------
    // CreateTestAsync — Duration < 60 сек трябва да хвърля InvalidOperationException
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task CreateTestAsync_WithDurationBelow60_Throws()
    {
        // Arrange
        await SeedUserAsync();
        var (service, _) = CreateService();
        var request = BuildMinimalRequest(duration: 59);

        // Act + Assert
        await service.Invoking(s => s.CreateTestAsync(request, _ownerId))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*минут*");
    }

    [Fact]
    public async Task CreateTestAsync_WithDurationZero_Throws()
    {
        // Arrange
        await SeedUserAsync();
        var (service, _) = CreateService();
        var request = BuildMinimalRequest(duration: 0);

        // Act + Assert
        await service.Invoking(s => s.CreateTestAsync(request, _ownerId))
            .Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task CreateTestAsync_WithNegativeDuration_Throws()
    {
        // Arrange
        await SeedUserAsync();
        var (service, _) = CreateService();
        var request = BuildMinimalRequest(duration: -1);

        // Act + Assert
        await service.Invoking(s => s.CreateTestAsync(request, _ownerId))
            .Should().ThrowAsync<InvalidOperationException>();
    }

    // ---------------------------------------------------------------------------
    // CreateTestAsync — Duration 1800 (30 мин, по подразбиране) трябва да се запази
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task CreateTestAsync_WithDuration1800_Persists()
    {
        // Arrange
        await SeedUserAsync();
        var (service, db) = CreateService();
        var request = BuildMinimalRequest(duration: 1800);

        // Act
        var result = await service.CreateTestAsync(request, _ownerId);

        // Assert
        var saved = db.Tests.First(t => t.Id == result.Id);
        saved.Duration.Should().Be(1800);
    }

    [Fact]
    public async Task CreateTestAsync_WithDuration60_Persists()
    {
        // 60 секунди = 1 минута — минималната валидна стойност
        await SeedUserAsync();
        var (service, db) = CreateService();
        var request = BuildMinimalRequest(duration: 60);

        var result = await service.CreateTestAsync(request, _ownerId);

        var saved = db.Tests.First(t => t.Id == result.Id);
        saved.Duration.Should().Be(60);
    }

    [Fact]
    public async Task CreateTestAsync_WithDuration28800_Persists()
    {
        // 28800 секунди = 480 минути = 8 часа — максималната валидна стойност
        await SeedUserAsync();
        var (service, db) = CreateService();
        var request = BuildMinimalRequest(duration: 28800);

        var result = await service.CreateTestAsync(request, _ownerId);

        var saved = db.Tests.First(t => t.Id == result.Id);
        saved.Duration.Should().Be(28800);
    }

    // ---------------------------------------------------------------------------
    // UpdateTestAsync — Duration < 60 трябва да хвърля InvalidOperationException
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task UpdateTestAsync_WithDurationBelow60_Throws()
    {
        // Arrange
        await SeedUserAsync();
        var (service, db) = CreateService();

        // Първо създаваме тест с валидна продължителност
        var createRequest = BuildMinimalRequest(duration: 1800);
        var created = await service.CreateTestAsync(createRequest, _ownerId);

        // Подготвяме заявка за обновяване с невалидна продължителност
        var updateRequest = BuildMinimalRequest(duration: 30);

        // Act + Assert
        await service.Invoking(s => s.UpdateTestAsync(created.Id, updateRequest, _ownerId))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*минут*");
    }

    [Fact]
    public async Task UpdateTestAsync_WithDurationZero_Throws()
    {
        // Arrange
        await SeedUserAsync();
        var (service, _) = CreateService();
        var created = await service.CreateTestAsync(BuildMinimalRequest(1800), _ownerId);

        var updateRequest = BuildMinimalRequest(duration: 0);

        // Act + Assert
        await service.Invoking(s => s.UpdateTestAsync(created.Id, updateRequest, _ownerId))
            .Should().ThrowAsync<InvalidOperationException>();
    }

    // ---------------------------------------------------------------------------
    // UpdateTestAsync — запазва Duration и НЕ пипа AttemptAnswers
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task UpdateTestAsync_UpdatesDurationButKeepsAttempts()
    {
        // Arrange
        await SeedUserAsync();
        var (service, db) = CreateService();

        // Създаваме тест
        var created = await service.CreateTestAsync(BuildMinimalRequest(1800), _ownerId);

        // Добавяме опит (imitates реален Attempt от ученик)
        var test = db.Tests.First(t => t.Id == created.Id);
        var attempt = new Attempt
        {
            Id = Guid.NewGuid(),
            TestId = test.Id,
            ParticipantName = "Тестов Ученик",
            Score = 1,
            TotalQuestions = 1,
            CreatedAt = DateTime.UtcNow
        };
        db.Attempts.Add(attempt);
        await db.SaveChangesAsync();

        // Act — обновяваме теста с нова продължителност
        var updateRequest = BuildMinimalRequest(duration: 2700); // 45 мин
        var updated = await service.UpdateTestAsync(created.Id, updateRequest, _ownerId);

        // Assert — Duration е обновена
        var savedTest = db.Tests.First(t => t.Id == created.Id);
        savedTest.Duration.Should().Be(2700);

        // Assert — Attempt-ът е запазен (опитите не се изтриват)
        var attempts = db.Attempts.Where(a => a.TestId == created.Id).ToList();
        attempts.Should().HaveCount(1);
        attempts[0].ParticipantName.Should().Be("Тестов Ученик");
    }

    public void Dispose() => _factory.Dispose();
}
