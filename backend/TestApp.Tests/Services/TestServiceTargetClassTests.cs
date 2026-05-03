// TestServiceTargetClassTests.cs
// RED тестове за Phase 1.A — TargetClass + EmailGate entity полета
// Commit 1: проверява дали новите полета се запазват в базата данни
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TestApp.Api.Dtos.Tests;
using TestApp.Api.Models;
using TestApp.Api.Services;
using TestApp.Tests.Helpers;

namespace TestApp.Tests.Services;

public class TestServiceTargetClassTests : IDisposable
{
    private readonly TestDbContextFactory _factory;
    private readonly Guid _ownerId = Guid.NewGuid();

    public TestServiceTargetClassTests()
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
                Email = "targetclass@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Pass123!"),
                FullName = "Target Class Test User"
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

    // Test.TargetClass се запазва в базата данни
    [Fact]
    public async Task CreateTestAsync_WithTargetClass_Persists()
    {
        // Arrange
        await SeedUserAsync();
        var (service, db) = CreateService();

        var request = new CreateTestRequest
        {
            Title = "Тест с клас",
            Description = "Описание",
            TargetClasses = new List<string> { "9А" },
            Questions = new List<CreateQuestionDto>
            {
                new()
                {
                    Text = "Въпрос?",
                    Type = "Closed",
                    Points = 1,
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

        // Assert — TargetClass е запазен
        var saved = db.Tests.First(t => t.Id == result.Id);
        saved.TargetClass.Should().Be("9А");
    }

    // Test.TargetClass може да е null (необязателно поле)
    [Fact]
    public async Task CreateTestAsync_WithoutTargetClass_PersistsNull()
    {
        // Arrange
        await SeedUserAsync();
        var (service, db) = CreateService();

        var request = new CreateTestRequest
        {
            Title = "Тест без клас",
            Description = "Описание",
            TargetClasses = new List<string>(),
            Questions = new List<CreateQuestionDto>
            {
                new()
                {
                    Text = "Въпрос?",
                    Type = "Closed",
                    Points = 1,
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

        // Assert — TargetClass е null
        var saved = db.Tests.First(t => t.Id == result.Id);
        saved.TargetClass.Should().BeNull();
    }

    // Multi-class TargetClasses се запазват като CSV в TargetClass колоната
    [Fact]
    public async Task CreateTestAsync_WithMultipleTargetClasses_PersistsAsCsv()
    {
        // Arrange
        await SeedUserAsync();
        var (service, db) = CreateService();

        var request = new CreateTestRequest
        {
            Title = "Тест за два класа",
            Description = "Описание",
            TargetClasses = new List<string> { "9А", "9Б" },
            Questions = new List<CreateQuestionDto>
            {
                new()
                {
                    Text = "Въпрос?",
                    Type = "Closed",
                    Points = 1,
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

        // Assert — записани като CSV, четат се обратно като списък
        var saved = db.Tests.First(t => t.Id == result.Id);
        saved.GetTargetClasses().Should().BeEquivalentTo(new[] { "9А", "9Б" });
    }

    // TargetClasses се включва в PublicTestResponse
    [Fact]
    public async Task GetPublicTestAsync_ReturnsTargetClasses()
    {
        // Arrange
        await SeedUserAsync();
        var db = _factory.CreateContext();

        var test = new Test
        {
            Id = Guid.NewGuid(),
            Title = "Публичен тест с клас",
            Description = "Описание",
            Duration = 1800,
            Status = TestStatus.Published,
            ShareCode = "TRGCLS01",
            OwnerId = _ownerId,
            TargetClass = "10Б",  // single class в CSV формат
            Questions = new List<Question>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    Text = "Въпрос?",
                    Type = "Closed",
                    OrderIndex = 0,
                    Answers = new List<Answer>
                    {
                        new() { Id = Guid.NewGuid(), Text = "А", IsCorrect = true, OrderIndex = 0 }
                    }
                }
            }
        };
        db.Tests.Add(test);
        await db.SaveChangesAsync();

        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen);

        // Act
        var result = await service.GetPublicTestAsync("TRGCLS01");

        // Assert
        result.Should().NotBeNull();
        result!.TargetClasses.Should().BeEquivalentTo(new[] { "10Б" });
    }
}
