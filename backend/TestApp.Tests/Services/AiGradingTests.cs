// AiGradingTests.cs
// Unit тестове за AiGradingService и за AI grading логиката в TestService

using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using System.Net;
using System.Text;
using System.Text.Json;
using TestApp.Api.Data;
using TestApp.Api.Dtos.Tests;
using TestApp.Api.Models;
using TestApp.Api.Models.Enums;
using TestApp.Api.Services;
using TestApp.Tests.Helpers;

namespace TestApp.Tests.Services;

public class AiGradingTests : IDisposable
{
    private readonly TestDbContextFactory _factory;
    private readonly Guid _ownerId = Guid.NewGuid();

    public AiGradingTests()
    {
        _factory = new TestDbContextFactory();
    }

    public void Dispose() => _factory.Dispose();

    // -------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------

    private async Task SeedUserAsync()
    {
        var db = _factory.CreateContext();
        if (!db.Users.Any(u => u.Id == _ownerId))
        {
            db.Users.Add(new AppUser
            {
                Id = _ownerId,
                Email = "ai_grading@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Pass123!"),
                FullName = "AI Grading Test User"
            });
            await db.SaveChangesAsync();
        }
    }

    private (TestService service, AppDbContext db) CreateServiceWithAi(IAiGradingService? aiGrading)
    {
        var db = _factory.CreateContext();
        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen, aiGrading);
        return (service, db);
    }

    private async Task<(Test test, Attempt attempt)> SeedTestAndAttemptWithOpenQuestion(
        string openText = "Отговорът на ученика")
    {
        await SeedUserAsync();
        var db = _factory.CreateContext();

        var openQuestion = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Обяснете какво е фотосинтеза?",
            Type = "Open",
            OrderIndex = 0,
            SampleAnswer = "Процес при който растенията произвеждат захари от CO2 и вода"
        };

        var closedQuestion = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Кое е вярно?",
            Type = "Closed",
            OrderIndex = 1,
            Answers = new List<Answer>
            {
                new() { Id = Guid.NewGuid(), Text = "Верен", IsCorrect = true, OrderIndex = 0 },
                new() { Id = Guid.NewGuid(), Text = "Грешен", IsCorrect = false, OrderIndex = 1 }
            }
        };

        var test = new Test
        {
            Id = Guid.NewGuid(),
            Title = "Тест с Open въпрос",
            Status = TestStatus.Published,
            ShareCode = $"OP{Guid.NewGuid():N}".Substring(0, 8).ToUpper(),
            OwnerId = _ownerId,
            CreatedAt = DateTime.UtcNow,
            Questions = new List<Question> { openQuestion, closedQuestion }
        };

        var correctAnswer = closedQuestion.Answers[0];

        var attempt = new Attempt
        {
            Id = Guid.NewGuid(),
            TestId = test.Id,
            ParticipantName = "Тест Участник",
            Score = 1,
            TotalQuestions = 1,
            CreatedAt = DateTime.UtcNow,
            AttemptAnswers = new List<AttemptAnswer>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    QuestionId = openQuestion.Id,
                    OpenText = openText,
                    IsCorrect = false,
                    GradingStatus = GradingStatus.Pending
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    QuestionId = closedQuestion.Id,
                    SelectedAnswerId = correctAnswer.Id,
                    IsCorrect = true,
                    GradingStatus = GradingStatus.NotApplicable
                }
            }
        };

        db.Tests.Add(test);
        db.Attempts.Add(attempt);
        await db.SaveChangesAsync();

        return (test, attempt);
    }

    // -------------------------------------------------------------------
    // GetAttemptDetailAsync tests
    // -------------------------------------------------------------------

    [Fact]
    public async Task GetAttemptDetail_ReturnsNull_WhenTestNotOwnedByUser()
    {
        // Arrange
        await SeedUserAsync();
        var (service, _) = CreateServiceWithAi(null);

        // Act
        var result = await service.GetAttemptDetailAsync(Guid.NewGuid(), Guid.NewGuid(), _ownerId);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAttemptDetail_ReturnsNull_WhenAttemptDoesNotBelongToTest()
    {
        // Arrange
        var (test, _) = await SeedTestAndAttemptWithOpenQuestion();
        var (service, _) = CreateServiceWithAi(null);

        // Act — верен test ID, грешен attempt ID
        var result = await service.GetAttemptDetailAsync(test.Id, Guid.NewGuid(), _ownerId);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAttemptDetail_ReturnsCorrectParticipantName()
    {
        // Arrange
        var (test, attempt) = await SeedTestAndAttemptWithOpenQuestion();
        var (service, _) = CreateServiceWithAi(null);

        // Act
        var result = await service.GetAttemptDetailAsync(test.Id, attempt.Id, _ownerId);

        // Assert
        result.Should().NotBeNull();
        result!.ParticipantName.Should().Be("Тест Участник");
    }

    [Fact]
    public async Task GetAttemptDetail_HasOpenAnswers_IsTrue_WhenTestHasOpenQuestion()
    {
        // Arrange
        var (test, attempt) = await SeedTestAndAttemptWithOpenQuestion();
        var (service, _) = CreateServiceWithAi(null);

        // Act
        var result = await service.GetAttemptDetailAsync(test.Id, attempt.Id, _ownerId);

        // Assert
        result.Should().NotBeNull();
        result!.HasOpenAnswers.Should().BeTrue();
    }

    [Fact]
    public async Task GetAttemptDetail_AllGraded_IsFalse_WhenPendingAnswersExist()
    {
        // Arrange
        var (test, attempt) = await SeedTestAndAttemptWithOpenQuestion();
        var (service, _) = CreateServiceWithAi(null);

        // Act
        var result = await service.GetAttemptDetailAsync(test.Id, attempt.Id, _ownerId);

        // Assert
        result.Should().NotBeNull();
        result!.AllGraded.Should().BeFalse();
    }

    [Fact]
    public async Task GetAttemptDetail_ReturnsAllQuestions()
    {
        // Arrange
        var (test, attempt) = await SeedTestAndAttemptWithOpenQuestion();
        var (service, _) = CreateServiceWithAi(null);

        // Act
        var result = await service.GetAttemptDetailAsync(test.Id, attempt.Id, _ownerId);

        // Assert
        result.Should().NotBeNull();
        result!.Questions.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetAttemptDetail_OpenQuestion_HasCorrectGradingStatus_Pending()
    {
        // Arrange
        var (test, attempt) = await SeedTestAndAttemptWithOpenQuestion();
        var (service, _) = CreateServiceWithAi(null);

        // Act
        var result = await service.GetAttemptDetailAsync(test.Id, attempt.Id, _ownerId);

        // Assert
        var openQuestion = result!.Questions.First(q => q.QuestionType == "Open");
        openQuestion.GradingStatus.Should().Be("Pending");
        openQuestion.Scorable.Should().BeFalse();
    }

    [Fact]
    public async Task GetAttemptDetail_ClosedQuestion_HasCorrectGradingStatus_NotApplicable()
    {
        // Arrange
        var (test, attempt) = await SeedTestAndAttemptWithOpenQuestion();
        var (service, _) = CreateServiceWithAi(null);

        // Act
        var result = await service.GetAttemptDetailAsync(test.Id, attempt.Id, _ownerId);

        // Assert
        var closedQuestion = result!.Questions.First(q => q.QuestionType == "Closed");
        closedQuestion.GradingStatus.Should().Be("NotApplicable");
        closedQuestion.Scorable.Should().BeTrue();
    }

    [Fact]
    public async Task GetAttemptDetail_ClosedQuestion_ShowsSelectedAndCorrectAnswers()
    {
        // Arrange
        var (test, attempt) = await SeedTestAndAttemptWithOpenQuestion();
        var (service, _) = CreateServiceWithAi(null);

        // Act
        var result = await service.GetAttemptDetailAsync(test.Id, attempt.Id, _ownerId);

        // Assert
        var closedQuestion = result!.Questions.First(q => q.QuestionType == "Closed");
        closedQuestion.Answers.Should().HaveCount(2);
        closedQuestion.Answers.Should().Contain(a => a.IsCorrect && a.WasSelected); // верният е избран
    }

    [Fact]
    public async Task GetAttemptDetail_OpenQuestion_ShowsOpenText()
    {
        // Arrange
        const string expectedText = "Фотосинтезата е процес на синтез на глюкоза";
        var (test, attempt) = await SeedTestAndAttemptWithOpenQuestion(expectedText);
        var (service, _) = CreateServiceWithAi(null);

        // Act
        var result = await service.GetAttemptDetailAsync(test.Id, attempt.Id, _ownerId);

        // Assert
        var openQuestion = result!.Questions.First(q => q.QuestionType == "Open");
        openQuestion.OpenText.Should().Be(expectedText);
    }

    // -------------------------------------------------------------------
    // GradeAttemptAsync — без AI (null)
    // -------------------------------------------------------------------

    [Fact]
    public async Task GradeAttempt_ReturnsTrue_EvenWithoutAiService()
    {
        // Arrange
        var (test, attempt) = await SeedTestAndAttemptWithOpenQuestion();
        var (service, _) = CreateServiceWithAi(null);

        // Act
        var result = await service.GradeAttemptAsync(test.Id, attempt.Id, _ownerId);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task GradeAttempt_MarksAnswersAsFailed_WhenAiServiceIsNull()
    {
        // Arrange
        var (test, attempt) = await SeedTestAndAttemptWithOpenQuestion();
        var (service, db) = CreateServiceWithAi(null);

        // Act
        await service.GradeAttemptAsync(test.Id, attempt.Id, _ownerId);

        // Assert — Pending отговорите трябва да станат Failed
        var freshAttempt = db.Attempts
            .Include(a => a.AttemptAnswers)
            .First(a => a.Id == attempt.Id);
        freshAttempt.AttemptAnswers
            .Where(aa => aa.GradingStatus != GradingStatus.NotApplicable)
            .Should().AllSatisfy(aa => aa.GradingStatus.Should().Be(GradingStatus.Failed));
    }

    [Fact]
    public async Task GradeAttempt_ReturnsFalse_WhenTestNotFound()
    {
        // Arrange
        await SeedUserAsync();
        var (service, _) = CreateServiceWithAi(null);

        // Act
        var result = await service.GradeAttemptAsync(Guid.NewGuid(), Guid.NewGuid(), _ownerId);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task GradeAttempt_ReturnsFalse_WhenAttemptNotFound()
    {
        // Arrange
        var (test, _) = await SeedTestAndAttemptWithOpenQuestion();
        var (service, _) = CreateServiceWithAi(null);

        // Act
        var result = await service.GradeAttemptAsync(test.Id, Guid.NewGuid(), _ownerId);

        // Assert
        result.Should().BeFalse();
    }

    // -------------------------------------------------------------------
    // GradeAttemptAsync — с mock AI (успешно оценяване)
    // -------------------------------------------------------------------

    [Fact]
    public async Task GradeAttempt_WithMockAi_SetsStatusToGraded()
    {
        // Arrange
        var (test, attempt) = await SeedTestAndAttemptWithOpenQuestion();
        var mockAi = new Mock<IAiGradingService>();
        mockAi.Setup(ai => ai.GradeAnswerAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string>(), It.IsAny<int>()))
            .ReturnsAsync((1, "Отговорът е правилен."));

        var (service, db) = CreateServiceWithAi(mockAi.Object);

        // Act
        await service.GradeAttemptAsync(test.Id, attempt.Id, _ownerId);

        // Assert
        var freshAttempt = db.Attempts
            .Include(a => a.AttemptAnswers)
            .First(a => a.Id == attempt.Id);
        var openAnswer = freshAttempt.AttemptAnswers.First(aa => aa.GradingStatus != GradingStatus.NotApplicable);
        openAnswer.GradingStatus.Should().Be(GradingStatus.Graded);
        openAnswer.AiScore.Should().Be(1);
        openAnswer.AiFeedback.Should().Be("Отговорът е правилен.");
        openAnswer.IsCorrect.Should().BeTrue();
        openAnswer.GradedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task GradeAttempt_WithMockAi_UpdatesScoreCorrectly()
    {
        // Arrange — 1 верен Closed + 1 верен Open (AI оценен)
        var (test, attempt) = await SeedTestAndAttemptWithOpenQuestion();
        var mockAi = new Mock<IAiGradingService>();
        mockAi.Setup(ai => ai.GradeAnswerAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string>(), It.IsAny<int>()))
            .ReturnsAsync((1, "Вярно!"));

        var (service, db) = CreateServiceWithAi(mockAi.Object);

        // Act
        await service.GradeAttemptAsync(test.Id, attempt.Id, _ownerId);

        // Assert — score = 1 (closed correct) + 1 (AI correct) = 2
        var freshAttempt = db.Attempts.First(a => a.Id == attempt.Id);
        freshAttempt.Score.Should().Be(2);
    }

    [Fact]
    public async Task GradeAttempt_WithMockAi_ScoreZero_WhenAiScoresZero()
    {
        // Arrange — 1 верен Closed + 1 грешен Open (AI score=0)
        var (test, attempt) = await SeedTestAndAttemptWithOpenQuestion();
        var mockAi = new Mock<IAiGradingService>();
        mockAi.Setup(ai => ai.GradeAnswerAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string>(), It.IsAny<int>()))
            .ReturnsAsync((0, "Отговорът е непълен."));

        var (service, db) = CreateServiceWithAi(mockAi.Object);

        // Act
        await service.GradeAttemptAsync(test.Id, attempt.Id, _ownerId);

        // Assert — score = 1 (closed correct) + 0 (AI wrong) = 1
        var freshAttempt = db.Attempts.First(a => a.Id == attempt.Id);
        freshAttempt.Score.Should().Be(1);
    }

    [Fact]
    public async Task GradeAttempt_WithMockAi_SetsFailedStatus_WhenAiThrows()
    {
        // Arrange
        var (test, attempt) = await SeedTestAndAttemptWithOpenQuestion();
        var mockAi = new Mock<IAiGradingService>();
        mockAi.Setup(ai => ai.GradeAnswerAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string>(), It.IsAny<int>()))
            .ThrowsAsync(new HttpRequestException("AI unavailable"));

        var (service, db) = CreateServiceWithAi(mockAi.Object);

        // Act — не хвърля
        await service.GradeAttemptAsync(test.Id, attempt.Id, _ownerId);

        // Assert
        var freshAttempt = db.Attempts
            .Include(a => a.AttemptAnswers)
            .First(a => a.Id == attempt.Id);
        var openAnswer = freshAttempt.AttemptAnswers.First(aa => aa.GradingStatus != GradingStatus.NotApplicable);
        openAnswer.GradingStatus.Should().Be(GradingStatus.Failed);
    }

    [Fact]
    public async Task GradeAttempt_DoesNotGrade_NotApplicableAnswers()
    {
        // Arrange
        var (test, attempt) = await SeedTestAndAttemptWithOpenQuestion();
        var mockAi = new Mock<IAiGradingService>();
        mockAi.Setup(ai => ai.GradeAnswerAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string>(), It.IsAny<int>()))
            .ReturnsAsync((1, "OK"));

        var (service, db) = CreateServiceWithAi(mockAi.Object);

        // Act
        await service.GradeAttemptAsync(test.Id, attempt.Id, _ownerId);

        // Assert — Closed/NotApplicable отговорите не са докоснати
        var freshAttempt = db.Attempts
            .Include(a => a.AttemptAnswers)
            .First(a => a.Id == attempt.Id);
        var closedAnswer = freshAttempt.AttemptAnswers
            .First(aa => aa.GradingStatus == GradingStatus.NotApplicable);
        closedAnswer.AiScore.Should().BeNull();
        closedAnswer.AiFeedback.Should().BeNull();
    }

    // -------------------------------------------------------------------
    // SubmitAttempt sets GradingStatus
    // -------------------------------------------------------------------

    [Fact]
    public async Task SubmitAttempt_SetsGradingStatusPending_ForOpenQuestions()
    {
        // Arrange
        await SeedUserAsync();
        var db = _factory.CreateContext();
        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen);

        var openQuestion = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Опишете синтаксиса на for цикъл.",
            Type = "Open",
            OrderIndex = 0
        };

        var test = new Test
        {
            Id = Guid.NewGuid(),
            Title = "Тест за Submit",
            Status = TestStatus.Published,
            ShareCode = $"SB{Guid.NewGuid():N}".Substring(0, 8).ToUpper(),
            OwnerId = _ownerId,
            CreatedAt = DateTime.UtcNow,
            Questions = new List<Question> { openQuestion }
        };

        db.Tests.Add(test);
        await db.SaveChangesAsync();

        var request = new TestApp.Api.Dtos.Tests.SubmitAttemptRequest
        {
            ParticipantName = "Студент",
            Answers = new List<TestApp.Api.Dtos.Tests.AttemptAnswerDto>
            {
                new()
                {
                    QuestionId = openQuestion.Id,
                    OpenText = "for (int i = 0; i < n; i++) { ... }"
                }
            }
        };

        // Act
        await service.SubmitAttemptAsync(test.ShareCode, request);

        // Assert — AttemptAnswer за Open въпрос е Pending
        var freshDb = _factory.CreateContext();
        var savedAttempts = freshDb.Attempts
            .Include(a => a.AttemptAnswers)
            .Where(a => a.TestId == test.Id)
            .ToList();

        savedAttempts.Should().HaveCount(1);
        var openAnswer = savedAttempts[0].AttemptAnswers.First(aa => aa.QuestionId == openQuestion.Id);
        openAnswer.GradingStatus.Should().Be(GradingStatus.Pending);
    }

    [Fact]
    public async Task SubmitAttempt_SetsGradingStatusNotApplicable_ForClosedQuestions()
    {
        // Arrange
        await SeedUserAsync();
        var db = _factory.CreateContext();
        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen);

        var answerId = Guid.NewGuid();
        var closedQuestion = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Кое е вярно?",
            Type = "Closed",
            OrderIndex = 0,
            Answers = new List<Answer>
            {
                new() { Id = answerId, Text = "Верен", IsCorrect = true, OrderIndex = 0 },
                new() { Id = Guid.NewGuid(), Text = "Грешен", IsCorrect = false, OrderIndex = 1 }
            }
        };

        var test = new Test
        {
            Id = Guid.NewGuid(),
            Title = "Тест Closed",
            Status = TestStatus.Published,
            ShareCode = $"CL{Guid.NewGuid():N}".Substring(0, 8).ToUpper(),
            OwnerId = _ownerId,
            CreatedAt = DateTime.UtcNow,
            Questions = new List<Question> { closedQuestion }
        };

        db.Tests.Add(test);
        await db.SaveChangesAsync();

        var request = new TestApp.Api.Dtos.Tests.SubmitAttemptRequest
        {
            ParticipantName = "Студент",
            Answers = new List<TestApp.Api.Dtos.Tests.AttemptAnswerDto>
            {
                new() { QuestionId = closedQuestion.Id, SelectedAnswerId = answerId }
            }
        };

        // Act
        await service.SubmitAttemptAsync(test.ShareCode, request);

        // Assert — AttemptAnswer за Closed въпрос е NotApplicable
        var freshDb = _factory.CreateContext();
        var savedAttempts = freshDb.Attempts
            .Include(a => a.AttemptAnswers)
            .Where(a => a.TestId == test.Id)
            .ToList();

        var closedAnswer = savedAttempts[0].AttemptAnswers.First(aa => aa.QuestionId == closedQuestion.Id);
        closedAnswer.GradingStatus.Should().Be(GradingStatus.NotApplicable);
    }
}
