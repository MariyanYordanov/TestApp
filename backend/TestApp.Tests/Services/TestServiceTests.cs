// Стъпка 37 — TestServiceTests.cs
// Тестове за TestService (CRUD тестове, опити, резултати)
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TestApp.Api.Dtos.Tests;
using TestApp.Api.Models;
using TestApp.Api.Services;
using TestApp.Tests.Helpers;

namespace TestApp.Tests.Services;

public class TestServiceTests : IDisposable
{
    private readonly TestDbContextFactory _factory;
    private readonly Guid _ownerId = Guid.NewGuid();

    public TestServiceTests()
    {
        _factory = new TestDbContextFactory();
    }

    // Помощен метод за създаване на TestService с нов context
    private (TestService service, TestApp.Api.Data.AppDbContext db) CreateService()
    {
        var db = _factory.CreateContext();
        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen);
        return (service, db);
    }

    // Помощен метод за създаване на тест потребител
    private async Task SeedUserAsync()
    {
        var db = _factory.CreateContext();
        if (!db.Users.Any(u => u.Id == _ownerId))
        {
            db.Users.Add(new AppUser
            {
                Id = _ownerId,
                Email = "owner@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Pass123!"),
                FullName = "Собственик"
            });
            await db.SaveChangesAsync();
        }
    }

    // Помощен метод за създаване на Published тест с въпроси
    private async Task<Test> SeedPublishedTestAsync(string shareCode = "TESTCODE")
    {
        await SeedUserAsync();
        var db = _factory.CreateContext();

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
            Title = "Публичен Тест",
            Description = "Описание",
            Duration = 1800,
            Status = TestStatus.Published,
            ShareCode = shareCode,
            OwnerId = _ownerId,
            CreatedAt = DateTime.UtcNow,
            Questions = new List<Question> { question }
        };

        db.Tests.Add(test);
        await db.SaveChangesAsync();
        return test;
    }

    // Тест: CreateTest записва тест с въпроси в базата данни
    [Fact]
    public async Task CreateTest_WithQuestions_SavesTestWithQuestionsToDb()
    {
        // Arrange
        await SeedUserAsync();
        var (service, db) = CreateService();
        var request = new CreateTestRequest
        {
            Title = "Нов тест",
            Description = "Описание",
            Duration = 900,
            Questions = new List<CreateQuestionDto>
            {
                new()
                {
                    Text = "Въпрос 1?",
                    Answers = new List<CreateAnswerDto>
                    {
                        new() { Text = "Отговор A", IsCorrect = true },
                        new() { Text = "Отговор B", IsCorrect = false }
                    }
                }
            }
        };

        // Act
        var result = await service.CreateTestAsync(request, _ownerId);

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().Be("Нов тест");
        result.QuestionsCount.Should().Be(1);

        var savedTest = db.Tests.First(t => t.Id == result.Id);
        savedTest.Should().NotBeNull();
        savedTest.OwnerId.Should().Be(_ownerId);
    }

    // Тест: CreateTest генерира ShareCode
    [Fact]
    public async Task CreateTest_GeneratesShareCode()
    {
        // Arrange
        await SeedUserAsync();
        var (service, _) = CreateService();
        var request = new CreateTestRequest
        {
            Title = "Тест за код",
            Questions = new List<CreateQuestionDto>
            {
                new()
                {
                    Text = "Въпрос?",
                    Answers = new List<CreateAnswerDto>
                    {
                        new() { Text = "Верен", IsCorrect = true },
                        new() { Text = "Грешен", IsCorrect = false }
                    }
                }
            }
        };

        // Act
        var result = await service.CreateTestAsync(request, _ownerId);

        // Assert
        result.ShareCode.Should().NotBeNullOrEmpty();
        result.ShareCode.Length.Should().Be(8);
        // Кодът съдържа само позволени символи
        result.ShareCode.Should().MatchRegex("^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$");
    }

    // Тест: GetTestsByOwner връща само тестовете на конкретния owner
    [Fact]
    public async Task GetTestsByOwner_ReturnsOnlyOwnerTests()
    {
        // Arrange
        var otherOwnerId = Guid.NewGuid();
        var db = _factory.CreateContext();

        // Добавя потребители
        db.Users.AddRange(
            new AppUser { Id = _ownerId, Email = "owner@t.com",
                PasswordHash = "h", FullName = "O1" },
            new AppUser { Id = otherOwnerId, Email = "other@t.com",
                PasswordHash = "h", FullName = "O2" }
        );

        // Добавя тестове за двамата собственици
        db.Tests.AddRange(
            new Test { OwnerId = _ownerId, Title = "Мой тест 1",
                ShareCode = "MYTEST01", Status = TestStatus.Draft },
            new Test { OwnerId = _ownerId, Title = "Мой тест 2",
                ShareCode = "MYTEST02", Status = TestStatus.Draft },
            new Test { OwnerId = otherOwnerId, Title = "Чужд тест",
                ShareCode = "OTHER001", Status = TestStatus.Draft }
        );
        await db.SaveChangesAsync();

        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen);

        // Act
        var result = await service.GetTestsByOwnerAsync(_ownerId);

        // Assert
        result.Should().HaveCount(2);
        result.Should().AllSatisfy(t => t.Title.Should().StartWith("Мой тест"));
    }

    // Тест: GetPublicTest за Published тест връща данни
    [Fact]
    public async Task GetPublicTest_ForPublishedTest_ReturnsData()
    {
        // Arrange
        await SeedPublishedTestAsync("PUBL0001");
        var (service, _) = CreateService();

        // Act
        var result = await service.GetPublicTestAsync("PUBL0001");

        // Assert
        result.Should().NotBeNull();
        result!.ShareCode.Should().Be("PUBL0001");
        result.Title.Should().Be("Публичен Тест");
        result.Questions.Should().HaveCount(1);
    }

    // Тест: GetPublicTest за Draft тест връща null
    [Fact]
    public async Task GetPublicTest_ForDraftTest_ReturnsNull()
    {
        // Arrange
        await SeedUserAsync();
        var db = _factory.CreateContext();
        db.Tests.Add(new Test
        {
            OwnerId = _ownerId,
            Title = "Draft тест",
            ShareCode = "DRAFT001",
            Status = TestStatus.Draft
        });
        await db.SaveChangesAsync();

        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen);

        // Act
        var result = await service.GetPublicTestAsync("DRAFT001");

        // Assert
        result.Should().BeNull();
    }

    // Тест: GetPublicTest за несъществуващ shareCode връща null
    [Fact]
    public async Task GetPublicTest_ForNonExistentShareCode_ReturnsNull()
    {
        // Arrange
        var (service, _) = CreateService();

        // Act
        var result = await service.GetPublicTestAsync("INVALID1");

        // Assert
        result.Should().BeNull();
    }

    // Тест: PublicTest response НЕ СЪДЪРЖА IsCorrect (проверява JSON)
    [Fact]
    public async Task GetPublicTest_ResponseDoesNotContainIsCorrect()
    {
        // Arrange
        await SeedPublishedTestAsync("NOISCRCT");
        var (service, _) = CreateService();

        // Act
        var result = await service.GetPublicTestAsync("NOISCRCT");

        // Assert — сериализира до JSON и проверява
        result.Should().NotBeNull();
        string json = JsonSerializer.Serialize(result);

        // JSON не трябва да съдържа "isCorrect" поле
        json.Should().NotContain("isCorrect",
            because: "публичният отговор не трябва да разкрива верните отговори");
        json.Should().NotContain("IsCorrect",
            because: "публичният отговор не трябва да разкрива верните отговори");
    }

    // Тест: SubmitAttempt изчислява score правилно (2/3 верни = score 2)
    [Fact]
    public async Task SubmitAttempt_WithPartiallyCorrectAnswers_CalculatesScoreCorrectly()
    {
        // Arrange
        await SeedUserAsync();
        var db = _factory.CreateContext();

        var q1 = new Question
        {
            Id = Guid.Parse("aaaaaaaa-0001-0001-0001-000000000001"),
            Text = "Въпрос 1", OrderIndex = 0,
            Answers = new List<Answer>
            {
                new() { Id = Guid.Parse("bbbbbbbb-0001-0001-0001-000000000001"),
                    Text = "Верен", IsCorrect = true, OrderIndex = 0 },
                new() { Id = Guid.Parse("bbbbbbbb-0001-0001-0001-000000000002"),
                    Text = "Грешен", IsCorrect = false, OrderIndex = 1 }
            }
        };
        var q2 = new Question
        {
            Id = Guid.Parse("aaaaaaaa-0002-0002-0002-000000000002"),
            Text = "Въпрос 2", OrderIndex = 1,
            Answers = new List<Answer>
            {
                new() { Id = Guid.Parse("bbbbbbbb-0002-0002-0002-000000000001"),
                    Text = "Верен", IsCorrect = true, OrderIndex = 0 },
                new() { Id = Guid.Parse("bbbbbbbb-0002-0002-0002-000000000002"),
                    Text = "Грешен", IsCorrect = false, OrderIndex = 1 }
            }
        };
        var q3 = new Question
        {
            Id = Guid.Parse("aaaaaaaa-0003-0003-0003-000000000003"),
            Text = "Въпрос 3", OrderIndex = 2,
            Answers = new List<Answer>
            {
                new() { Id = Guid.Parse("bbbbbbbb-0003-0003-0003-000000000001"),
                    Text = "Верен", IsCorrect = true, OrderIndex = 0 },
                new() { Id = Guid.Parse("bbbbbbbb-0003-0003-0003-000000000002"),
                    Text = "Грешен", IsCorrect = false, OrderIndex = 1 }
            }
        };

        var test = new Test
        {
            Id = Guid.NewGuid(),
            OwnerId = _ownerId,
            Title = "Score тест",
            ShareCode = "SCORE001",
            Status = TestStatus.Published,
            Questions = new List<Question> { q1, q2, q3 }
        };
        db.Tests.Add(test);
        await db.SaveChangesAsync();

        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen);

        var request = new SubmitAttemptRequest
        {
            ParticipantName = "Тест Ученик",
            Answers = new List<AttemptAnswerDto>
            {
                // Верен отговор за въпрос 1
                new() { QuestionId = q1.Id,
                    SelectedAnswerId = Guid.Parse("bbbbbbbb-0001-0001-0001-000000000001") },
                // Верен отговор за въпрос 2
                new() { QuestionId = q2.Id,
                    SelectedAnswerId = Guid.Parse("bbbbbbbb-0002-0002-0002-000000000001") },
                // Грешен отговор за въпрос 3
                new() { QuestionId = q3.Id,
                    SelectedAnswerId = Guid.Parse("bbbbbbbb-0003-0003-0003-000000000002") }
            }
        };

        // Act
        var result = await service.SubmitAttemptAsync("SCORE001", request);

        // Assert
        result.Should().NotBeNull();
        result!.Score.Should().Be(2);
        result.TotalQuestions.Should().Be(3);
    }

    // Тест: SubmitAttempt с 0 верни → score 0
    [Fact]
    public async Task SubmitAttempt_WithAllWrongAnswers_ReturnsScoreZero()
    {
        // Arrange
        await SeedPublishedTestAsync("ZERO0001");
        var (service, db) = CreateService();

        // Взима въпроса и грешния отговор
        var test = db.Tests
            .Include(t => t.Questions)
            .ThenInclude(q => q.Answers)
            .First(t => t.ShareCode == "ZERO0001");

        var question = test.Questions.First();
        var wrongAnswer = question.Answers.First(a => !a.IsCorrect);

        var request = new SubmitAttemptRequest
        {
            ParticipantName = "Грешен Ученик",
            Answers = new List<AttemptAnswerDto>
            {
                new() { QuestionId = question.Id, SelectedAnswerId = wrongAnswer.Id }
            }
        };

        // Act
        var result = await service.SubmitAttemptAsync("ZERO0001", request);

        // Assert
        result.Should().NotBeNull();
        result!.Score.Should().Be(0);
    }

    // Тест: SubmitAttempt записва Attempt в DB
    [Fact]
    public async Task SubmitAttempt_SavesAttemptToDatabase()
    {
        // Arrange
        await SeedPublishedTestAsync("SAVE0001");
        var (service, db) = CreateService();

        var test = db.Tests
            .Include(t => t.Questions)
            .ThenInclude(q => q.Answers)
            .First(t => t.ShareCode == "SAVE0001");

        var question = test.Questions.First();
        var correctAnswer = question.Answers.First(a => a.IsCorrect);

        var request = new SubmitAttemptRequest
        {
            ParticipantName = "Записан Ученик",
            Answers = new List<AttemptAnswerDto>
            {
                new() { QuestionId = question.Id, SelectedAnswerId = correctAnswer.Id }
            }
        };

        // Act
        await service.SubmitAttemptAsync("SAVE0001", request);

        // Assert — проверява дали опитът е записан в базата
        var attempt = db.Attempts.FirstOrDefault(a =>
            a.ParticipantName == "Записан Ученик");

        attempt.Should().NotBeNull();
        attempt!.TestId.Should().Be(test.Id);
        attempt.Score.Should().Be(1);
    }

    // Тест: GetFullTest само ако ownerId съвпада
    [Fact]
    public async Task GetFullTest_WithWrongOwnerId_ReturnsNull()
    {
        // Arrange
        await SeedPublishedTestAsync("FULLTEST");
        var (service, db) = CreateService();
        var wrongOwnerId = Guid.NewGuid();

        var test = db.Tests.First(t => t.ShareCode == "FULLTEST");

        // Act
        var result = await service.GetFullTestAsync(test.Id, wrongOwnerId);

        // Assert
        result.Should().BeNull();
    }

    public void Dispose() => _factory.Dispose();
}
