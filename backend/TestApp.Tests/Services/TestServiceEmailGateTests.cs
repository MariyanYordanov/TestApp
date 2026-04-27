// TestServiceEmailGateTests.cs
// RED тестове за email gate + single-attempt enforcement — Phase 2.A
// 8 теста: email required, lookup, name override, single-attempt, voiding
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using TestApp.Api.Dtos.Tests;
using TestApp.Api.Models;
using TestApp.Api.Services;
using TestApp.Tests.Helpers;

namespace TestApp.Tests.Services;

public class TestServiceEmailGateTests : IDisposable
{
    private readonly TestDbContextFactory _factory;
    private readonly Guid _ownerId = Guid.NewGuid();

    public TestServiceEmailGateTests()
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
                Email = "emailgate@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Pass123!"),
                FullName = "Email Gate Test User"
            });
            await db.SaveChangesAsync();
        }
    }

    private (TestService service, TestApp.Api.Data.AppDbContext db) CreateService(
        IStudentDirectoryService? directory = null)
    {
        var db = _factory.CreateContext();
        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen, directory: directory);
        return (service, db);
    }

    // Помощен метод — сийдва Published тест с email gate
    private async Task<Test> SeedEmailGateTestAsync(
        string shareCode = "EGTEST01",
        bool requireEmailGate = true)
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
                new() { Id = Guid.NewGuid(), Text = "Верен", IsCorrect = true, OrderIndex = 0 },
                new() { Id = Guid.NewGuid(), Text = "Грешен", IsCorrect = false, OrderIndex = 1 }
            }
        };

        var test = new Test
        {
            Id = Guid.NewGuid(),
            Title = "Email Gate Тест",
            Description = "Описание",
            Duration = 1800,
            Status = TestStatus.Published,
            ShareCode = shareCode,
            OwnerId = _ownerId,
            RequireEmailGate = requireEmailGate,
            Questions = new List<Question> { question }
        };

        db.Tests.Add(test);
        await db.SaveChangesAsync();
        return test;
    }

    // --- Тест 1: EmailGate=false → стандартно поведение, не изисква email ---
    [Fact]
    public async Task SubmitAttemptAsync_WithoutEmailGate_IgnoresEmail()
    {
        // Arrange
        await SeedEmailGateTestAsync("NOGATE01", requireEmailGate: false);

        var (service, db) = CreateService();

        var request = new SubmitAttemptRequest
        {
            ParticipantName = "Ученик",
            // ParticipantEmail = null — без email gate
            Answers = new List<AttemptAnswerDto>()
        };

        // Act
        var result = await service.SubmitAttemptAsync("NOGATE01", request);

        // Assert — успешен submit без email
        result.Should().NotBeNull();
        var saved = db.Attempts.First(a => a.TestId == db.Tests.First(t => t.ShareCode == "NOGATE01").Id);
        saved.ParticipantEmail.Should().BeNull();
    }

    // --- Тест 2: EmailGate=true, email липсва → връща null (refusal) ---
    [Fact]
    public async Task SubmitAttemptAsync_EmailGateTrue_NoEmail_ReturnsNull()
    {
        // Arrange
        await SeedEmailGateTestAsync("EGNOEM01", requireEmailGate: true);

        // Mock directory — email не е намерен
        var mockDir = new Mock<IStudentDirectoryService>();
        mockDir.Setup(d => d.IsAvailable).Returns(true);
        mockDir.Setup(d => d.FindByEmail(It.IsAny<string>())).Returns((StudentLookupResult?)null);

        var (service, _) = CreateService(mockDir.Object);

        var request = new SubmitAttemptRequest
        {
            ParticipantName = "Ученик",
            ParticipantEmail = null, // липсва email
            Answers = new List<AttemptAnswerDto>()
        };

        // Act
        var result = await service.SubmitAttemptAsync("EGNOEM01", request);

        // Assert — не е записан опит, резултатът е null
        result.Should().BeNull();
    }

    // --- Тест 3: EmailGate=true, email не е намерен в директорията → null ---
    [Fact]
    public async Task SubmitAttemptAsync_EmailGateTrue_UnknownEmail_ReturnsNull()
    {
        // Arrange
        await SeedEmailGateTestAsync("EGUNKEM1", requireEmailGate: true);

        var mockDir = new Mock<IStudentDirectoryService>();
        mockDir.Setup(d => d.IsAvailable).Returns(true);
        mockDir.Setup(d => d.FindByEmail("unknown@school.bg")).Returns((StudentLookupResult?)null);

        var (service, db) = CreateService(mockDir.Object);

        var request = new SubmitAttemptRequest
        {
            ParticipantName = "Непознат",
            ParticipantEmail = "unknown@school.bg",
            Answers = new List<AttemptAnswerDto>()
        };

        // Act
        var result = await service.SubmitAttemptAsync("EGUNKEM1", request);

        // Assert
        result.Should().BeNull();
        db.Attempts.Count(a => a.TestId == db.Tests.First(t => t.ShareCode == "EGUNKEM1").Id)
            .Should().Be(0);
    }

    // --- Тест 4: EmailGate=true, валиден email → ParticipantName се override-ва от директорията ---
    [Fact]
    public async Task SubmitAttemptAsync_EmailGateTrue_ValidEmail_OverridesParticipantName()
    {
        // Arrange
        await SeedEmailGateTestAsync("EGOVER01", requireEmailGate: true);

        var lookupResult = new StudentLookupResult("Иван Петров Иванов", "9А");
        var mockDir = new Mock<IStudentDirectoryService>();
        mockDir.Setup(d => d.IsAvailable).Returns(true);
        mockDir.Setup(d => d.FindByEmail("ivan@school.bg")).Returns(lookupResult);

        var (service, db) = CreateService(mockDir.Object);

        var request = new SubmitAttemptRequest
        {
            ParticipantName = "Иван", // short name — ще бъде overridden
            ParticipantEmail = "ivan@school.bg",
            Answers = new List<AttemptAnswerDto>()
        };

        // Act
        var result = await service.SubmitAttemptAsync("EGOVER01", request);

        // Assert — ParticipantName е от директорията
        result.Should().NotBeNull();
        var saved = db.Attempts.First(a => a.TestId == db.Tests.First(t => t.ShareCode == "EGOVER01").Id);
        saved.ParticipantName.Should().Be("Иван Петров Иванов");
    }

    // --- Тест 5: EmailGate=true — email се нормализира преди запис (lowercase, trim) ---
    [Fact]
    public async Task SubmitAttemptAsync_EmailGateTrue_NormalizesEmailBeforeStorage()
    {
        // Arrange
        await SeedEmailGateTestAsync("EGNORM01", requireEmailGate: true);

        var lookupResult = new StudentLookupResult("Мария Колева", "9Б");
        var mockDir = new Mock<IStudentDirectoryService>();
        mockDir.Setup(d => d.IsAvailable).Returns(true);
        // FindByEmail ще бъде извикано с нормализиран имейл
        mockDir.Setup(d => d.FindByEmail("maria@school.bg")).Returns(lookupResult);

        var (service, db) = CreateService(mockDir.Object);

        var request = new SubmitAttemptRequest
        {
            ParticipantName = "Мария",
            ParticipantEmail = "  MARIA@school.bg  ", // с главни букви и интервали
            Answers = new List<AttemptAnswerDto>()
        };

        // Act
        var result = await service.SubmitAttemptAsync("EGNORM01", request);

        // Assert — email е запазен в lowercase без интервали
        result.Should().NotBeNull();
        var saved = db.Attempts.First(a => a.TestId == db.Tests.First(t => t.ShareCode == "EGNORM01").Id);
        saved.ParticipantEmail.Should().Be("maria@school.bg");
    }

    // --- Тест 6: Single-attempt — втори опит с същия email се блокира ---
    [Fact]
    public async Task SubmitAttemptAsync_EmailGateTrue_DuplicateEmail_ReturnsNull()
    {
        // Arrange
        await SeedEmailGateTestAsync("EGDUP001", requireEmailGate: true);

        var lookupResult = new StudentLookupResult("Дублиращ Ученик", "9А");
        var mockDir = new Mock<IStudentDirectoryService>();
        mockDir.Setup(d => d.IsAvailable).Returns(true);
        mockDir.Setup(d => d.FindByEmail("dup@school.bg")).Returns(lookupResult);

        var (service, db) = CreateService(mockDir.Object);

        var request = new SubmitAttemptRequest
        {
            ParticipantName = "Ученик",
            ParticipantEmail = "dup@school.bg",
            Answers = new List<AttemptAnswerDto>()
        };

        // Act — първи submit (успешен)
        var firstResult = await service.SubmitAttemptAsync("EGDUP001", request);
        firstResult.Should().NotBeNull();

        // Act — втори submit (блокиран)
        var (service2, _) = CreateService(mockDir.Object);
        var secondResult = await service2.SubmitAttemptAsync("EGDUP001", request);

        // Assert — вторият submit е блокиран
        secondResult.Should().BeNull();
    }

    // --- Тест 7: EmailGate=true, директорията не е достъпна → fail-open (пропуска gate) ---
    [Fact]
    public async Task SubmitAttemptAsync_EmailGateTrue_DirectoryUnavailable_FailOpen()
    {
        // Arrange
        await SeedEmailGateTestAsync("EGOPEN01", requireEmailGate: true);

        // Directory е недостъпна (файлът не съществува)
        var mockDir = new Mock<IStudentDirectoryService>();
        mockDir.Setup(d => d.IsAvailable).Returns(false);
        mockDir.Setup(d => d.FindByEmail(It.IsAny<string>())).Returns((StudentLookupResult?)null);

        var (service, db) = CreateService(mockDir.Object);

        var request = new SubmitAttemptRequest
        {
            ParticipantName = "Ученик",
            ParticipantEmail = "any@school.bg",
            Answers = new List<AttemptAnswerDto>()
        };

        // Act — при недостъпна директория gate се пропуска
        var result = await service.SubmitAttemptAsync("EGOPEN01", request);

        // Assert — успешен submit (fail-open)
        result.Should().NotBeNull();
    }

    // --- Тест 8: EmailGate=true, voided attempt → ученикът може да направи нов опит ---
    [Fact]
    public async Task SubmitAttemptAsync_EmailGateTrue_VoidedAttempt_AllowsNewSubmit()
    {
        // Arrange
        await SeedEmailGateTestAsync("EGVOID01", requireEmailGate: true);

        var lookupResult = new StudentLookupResult("Иван Тестов", "9А");
        var mockDir = new Mock<IStudentDirectoryService>();
        mockDir.Setup(d => d.IsAvailable).Returns(true);
        mockDir.Setup(d => d.FindByEmail("ivan.t@school.bg")).Returns(lookupResult);

        var (service, db) = CreateService(mockDir.Object);

        var request = new SubmitAttemptRequest
        {
            ParticipantName = "Иван",
            ParticipantEmail = "ivan.t@school.bg",
            Answers = new List<AttemptAnswerDto>()
        };

        // Първи submit
        var firstResult = await service.SubmitAttemptAsync("EGVOID01", request);
        firstResult.Should().NotBeNull();

        // Void attempt-а
        var testId = db.Tests.First(t => t.ShareCode == "EGVOID01").Id;
        var attempt = db.Attempts.First(a => a.TestId == testId);
        var (service2, db2) = CreateService(mockDir.Object);
        var voidSuccess = await service2.VoidAttemptAsync(testId, attempt.Id, _ownerId);
        voidSuccess.Should().BeTrue();

        // Act — втори submit след void
        var (service3, _) = CreateService(mockDir.Object);
        var secondResult = await service3.SubmitAttemptAsync("EGVOID01", request);

        // Assert — новият submit е успешен
        secondResult.Should().NotBeNull();
    }
}
