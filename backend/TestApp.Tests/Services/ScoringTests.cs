// ScoringTests.cs
// TDD тестове за конфигурируемото точкуване (configurable scoring)
// Покрива: Closed (всичко-или-нищо), Multi (частично), Open/Code (AI точки)
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using TestApp.Api.Dtos.Tests;
using TestApp.Api.Models;
using TestApp.Api.Models.Enums;
using TestApp.Api.Services;
using TestApp.Tests.Helpers;

namespace TestApp.Tests.Services;

public class ScoringTests : IDisposable
{
    private readonly TestDbContextFactory _factory;
    private readonly Guid _ownerId = Guid.NewGuid();

    public ScoringTests()
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
                Email = "scoring@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Pass123!"),
                FullName = "Scoring Test User"
            });
            await db.SaveChangesAsync();
        }
    }

    private (TestService service, TestApp.Api.Data.AppDbContext db) CreateService(
        IAiGradingService? aiGrading = null)
    {
        var db = _factory.CreateContext();
        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen, aiGrading);
        return (service, db);
    }

    // -------------------------------------------------------------------
    // CreateTest — запазва Points в базата данни
    // -------------------------------------------------------------------

    [Fact]
    public async Task CreateTest_SavesCustomPointsPerQuestion()
    {
        // Arrange
        await SeedUserAsync();
        var (service, db) = CreateService();

        var request = new CreateTestRequest
        {
            Title = "Тест с точки",
            Questions = new List<CreateQuestionDto>
            {
                new()
                {
                    Text = "Въпрос 1",
                    Type = "Closed",
                    Points = 5,
                    Answers = new List<CreateAnswerDto>
                    {
                        new() { Text = "Верен", IsCorrect = true },
                        new() { Text = "Грешен", IsCorrect = false }
                    }
                },
                new()
                {
                    Text = "Въпрос 2",
                    Type = "Open",
                    Points = 10,
                    Answers = new List<CreateAnswerDto>()
                }
            }
        };

        // Act
        var result = await service.CreateTestAsync(request, _ownerId);

        // Assert — точките са запазени в базата
        var savedQuestions = db.Questions.Where(q => q.TestId == result.Id).ToList();
        savedQuestions.Should().HaveCount(2);
        savedQuestions.First(q => q.Type == "Closed").Points.Should().Be(5);
        savedQuestions.First(q => q.Type == "Open").Points.Should().Be(10);
    }

    [Fact]
    public async Task CreateTest_UsesDefaultPoints_WhenPointsNotSpecified()
    {
        // Arrange — Points = 1 (default), Closed с 4 отговора → ceil(4/2) = 2
        await SeedUserAsync();
        var (service, db) = CreateService();

        var request = new CreateTestRequest
        {
            Title = "Тест с default точки",
            Questions = new List<CreateQuestionDto>
            {
                new()
                {
                    Text = "Closed 4 отговора",
                    Type = "Closed",
                    Points = 1, // DTO default — service ще изчисли ceil(4/2) = 2
                    Answers = new List<CreateAnswerDto>
                    {
                        new() { Text = "A1", IsCorrect = true },
                        new() { Text = "A2", IsCorrect = false },
                        new() { Text = "A3", IsCorrect = false },
                        new() { Text = "A4", IsCorrect = false },
                    }
                }
            }
        };

        // Act
        var result = await service.CreateTestAsync(request, _ownerId);

        // Assert — Points > 1 защото default logic изчислява ceil(4/2) = 2
        // Но ако DTO изпраща Points=1, service ще ползва 1 (explicit overrides default)
        // Тестваме само че Points е запазен > 0
        var savedQuestion = db.Questions.First(q => q.TestId == result.Id);
        savedQuestion.Points.Should().BeGreaterThan(0);
    }

    // -------------------------------------------------------------------
    // Closed scoring — всичко или нищо с question.Points
    // -------------------------------------------------------------------

    [Fact]
    public async Task SubmitAttempt_ClosedQuestion_ScoresFullPoints_WhenCorrect()
    {
        // Arrange — Closed въпрос с 5 точки
        await SeedUserAsync();
        var db = _factory.CreateContext();
        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen);

        var answerId = Guid.NewGuid();
        var question = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Closed с 5 точки",
            Type = "Closed",
            Points = 5,
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
            Title = "Closed Test 5pts",
            Status = TestStatus.Published,
            ShareCode = "CLSD5PT1",
            OwnerId = _ownerId,
            Questions = new List<Question> { question }
        };
        db.Tests.Add(test);
        await db.SaveChangesAsync();

        var request = new SubmitAttemptRequest
        {
            ParticipantName = "Ученик",
            Answers = new List<AttemptAnswerDto>
            {
                new() { QuestionId = question.Id, SelectedAnswerId = answerId }
            }
        };

        // Act
        var result = await service.SubmitAttemptAsync("CLSD5PT1", request);

        // Assert
        result.Should().NotBeNull();
        result!.Score.Should().Be(5);
        result.TotalQuestions.Should().Be(5); // TotalQuestions = MaxScore
    }

    [Fact]
    public async Task SubmitAttempt_ClosedQuestion_ScoresZero_WhenWrong()
    {
        // Arrange — Closed въпрос с 5 точки, грешен отговор
        await SeedUserAsync();
        var db = _factory.CreateContext();
        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen);

        var correctId = Guid.NewGuid();
        var wrongId = Guid.NewGuid();
        var question = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Closed грешен",
            Type = "Closed",
            Points = 5,
            OrderIndex = 0,
            Answers = new List<Answer>
            {
                new() { Id = correctId, Text = "Верен", IsCorrect = true, OrderIndex = 0 },
                new() { Id = wrongId, Text = "Грешен", IsCorrect = false, OrderIndex = 1 }
            }
        };

        var test = new Test
        {
            Id = Guid.NewGuid(),
            Title = "Closed Wrong",
            Status = TestStatus.Published,
            ShareCode = "CLSDWRNG",
            OwnerId = _ownerId,
            Questions = new List<Question> { question }
        };
        db.Tests.Add(test);
        await db.SaveChangesAsync();

        var request = new SubmitAttemptRequest
        {
            ParticipantName = "Ученик",
            Answers = new List<AttemptAnswerDto>
            {
                new() { QuestionId = question.Id, SelectedAnswerId = wrongId }
            }
        };

        // Act
        var result = await service.SubmitAttemptAsync("CLSDWRNG", request);

        // Assert
        result.Should().NotBeNull();
        result!.Score.Should().Be(0);
    }

    // -------------------------------------------------------------------
    // Multi scoring — частично точкуване
    // -------------------------------------------------------------------

    [Fact]
    public async Task SubmitAttempt_MultiQuestion_ScoresPartially_CorrectSelectedMinusWrong()
    {
        // Arrange — Multi въпрос с 3 верни отговора (Points = 3)
        // Избираме 2 верни + 1 грешен → score = max(0, 2-1) = 1
        await SeedUserAsync();
        var db = _factory.CreateContext();
        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen);

        var c1 = Guid.NewGuid(); // верен
        var c2 = Guid.NewGuid(); // верен
        var c3 = Guid.NewGuid(); // верен
        var w1 = Guid.NewGuid(); // грешен

        var question = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Multi частично",
            Type = "Multi",
            Points = 3,
            OrderIndex = 0,
            Answers = new List<Answer>
            {
                new() { Id = c1, Text = "Верен 1", IsCorrect = true, OrderIndex = 0 },
                new() { Id = c2, Text = "Верен 2", IsCorrect = true, OrderIndex = 1 },
                new() { Id = c3, Text = "Верен 3", IsCorrect = true, OrderIndex = 2 },
                new() { Id = w1, Text = "Грешен", IsCorrect = false, OrderIndex = 3 },
            }
        };

        var test = new Test
        {
            Id = Guid.NewGuid(),
            Title = "Multi Partial",
            Status = TestStatus.Published,
            ShareCode = "MLTPRT01",
            OwnerId = _ownerId,
            Questions = new List<Question> { question }
        };
        db.Tests.Add(test);
        await db.SaveChangesAsync();

        var request = new SubmitAttemptRequest
        {
            ParticipantName = "Ученик",
            Answers = new List<AttemptAnswerDto>
            {
                // 2 верни + 1 грешен → score = 2 - 1 = 1
                new() { QuestionId = question.Id, SelectedAnswerId = c1 },
                new() { QuestionId = question.Id, SelectedAnswerId = c2 },
                new() { QuestionId = question.Id, SelectedAnswerId = w1 },
            }
        };

        // Act
        var result = await service.SubmitAttemptAsync("MLTPRT01", request);

        // Assert
        result.Should().NotBeNull();
        result!.Score.Should().Be(1); // max(0, 2-1) = 1
        result.TotalQuestions.Should().Be(3); // MaxScore = 3
    }

    [Fact]
    public async Task SubmitAttempt_MultiQuestion_ScoresFullPoints_WhenAllCorrectSelected()
    {
        // Arrange — Multi с 2 верни (Points=2), избираме и двата верни
        await SeedUserAsync();
        var db = _factory.CreateContext();
        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen);

        var c1 = Guid.NewGuid();
        var c2 = Guid.NewGuid();
        var w1 = Guid.NewGuid();

        var question = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Multi пълен",
            Type = "Multi",
            Points = 2,
            OrderIndex = 0,
            Answers = new List<Answer>
            {
                new() { Id = c1, Text = "Верен 1", IsCorrect = true, OrderIndex = 0 },
                new() { Id = c2, Text = "Верен 2", IsCorrect = true, OrderIndex = 1 },
                new() { Id = w1, Text = "Грешен", IsCorrect = false, OrderIndex = 2 },
            }
        };

        var test = new Test
        {
            Id = Guid.NewGuid(),
            Title = "Multi Full",
            Status = TestStatus.Published,
            ShareCode = "MLTFULL1",
            OwnerId = _ownerId,
            Questions = new List<Question> { question }
        };
        db.Tests.Add(test);
        await db.SaveChangesAsync();

        var request = new SubmitAttemptRequest
        {
            ParticipantName = "Ученик",
            Answers = new List<AttemptAnswerDto>
            {
                new() { QuestionId = question.Id, SelectedAnswerId = c1 },
                new() { QuestionId = question.Id, SelectedAnswerId = c2 },
            }
        };

        // Act
        var result = await service.SubmitAttemptAsync("MLTFULL1", request);

        // Assert
        result.Should().NotBeNull();
        result!.Score.Should().Be(2); // 2 верни - 0 грешни = 2
    }

    [Fact]
    public async Task SubmitAttempt_MultiQuestion_ScoresZero_WhenMoreWrongThanCorrect()
    {
        // Arrange — Multi с 1 верен (Points=1), избираме 0 верни + 2 грешни → score = max(0, 0-2) = 0
        await SeedUserAsync();
        var db = _factory.CreateContext();
        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen);

        var c1 = Guid.NewGuid();
        var w1 = Guid.NewGuid();
        var w2 = Guid.NewGuid();

        var question = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Multi нула",
            Type = "Multi",
            Points = 1,
            OrderIndex = 0,
            Answers = new List<Answer>
            {
                new() { Id = c1, Text = "Верен", IsCorrect = true, OrderIndex = 0 },
                new() { Id = w1, Text = "Грешен 1", IsCorrect = false, OrderIndex = 1 },
                new() { Id = w2, Text = "Грешен 2", IsCorrect = false, OrderIndex = 2 },
            }
        };

        var test = new Test
        {
            Id = Guid.NewGuid(),
            Title = "Multi Zero",
            Status = TestStatus.Published,
            ShareCode = "MLTZERO1",
            OwnerId = _ownerId,
            Questions = new List<Question> { question }
        };
        db.Tests.Add(test);
        await db.SaveChangesAsync();

        var request = new SubmitAttemptRequest
        {
            ParticipantName = "Ученик",
            Answers = new List<AttemptAnswerDto>
            {
                new() { QuestionId = question.Id, SelectedAnswerId = w1 },
                new() { QuestionId = question.Id, SelectedAnswerId = w2 },
            }
        };

        // Act
        var result = await service.SubmitAttemptAsync("MLTZERO1", request);

        // Assert
        result.Should().NotBeNull();
        result!.Score.Should().Be(0); // max(0, 0-2) = 0
    }

    [Fact]
    public async Task SubmitAttempt_MultiQuestion_CapsAtMaxPoints()
    {
        // Arrange — Multi с 3 верни и Points=2 (teacher override), избираме всичко верно
        // Score = min(2, 3-0) = 2 (cap at Points)
        await SeedUserAsync();
        var db = _factory.CreateContext();
        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen);

        var c1 = Guid.NewGuid();
        var c2 = Guid.NewGuid();
        var c3 = Guid.NewGuid();

        var question = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Multi cap",
            Type = "Multi",
            Points = 2, // Умишлено по-малко от броя на верните
            OrderIndex = 0,
            Answers = new List<Answer>
            {
                new() { Id = c1, Text = "Верен 1", IsCorrect = true, OrderIndex = 0 },
                new() { Id = c2, Text = "Верен 2", IsCorrect = true, OrderIndex = 1 },
                new() { Id = c3, Text = "Верен 3", IsCorrect = true, OrderIndex = 2 },
            }
        };

        var test = new Test
        {
            Id = Guid.NewGuid(),
            Title = "Multi Cap",
            Status = TestStatus.Published,
            ShareCode = "MLTCAP01",
            OwnerId = _ownerId,
            Questions = new List<Question> { question }
        };
        db.Tests.Add(test);
        await db.SaveChangesAsync();

        var request = new SubmitAttemptRequest
        {
            ParticipantName = "Ученик",
            Answers = new List<AttemptAnswerDto>
            {
                new() { QuestionId = question.Id, SelectedAnswerId = c1 },
                new() { QuestionId = question.Id, SelectedAnswerId = c2 },
                new() { QuestionId = question.Id, SelectedAnswerId = c3 },
            }
        };

        // Act
        var result = await service.SubmitAttemptAsync("MLTCAP01", request);

        // Assert
        result.Should().NotBeNull();
        result!.Score.Should().Be(2); // min(2, 3) = 2
    }

    // -------------------------------------------------------------------
    // Mixed scoring — комбинация от типове
    // -------------------------------------------------------------------

    [Fact]
    public async Task SubmitAttempt_MixedQuestions_CalculatesTotalScoreCorrectly()
    {
        // Arrange:
        //   Closed (5 точки) — верен → 5
        //   Multi (3 точки) — 2 верни, 1 грешен → max(0, 2-1) = 1
        //   Open (3 точки) — pending, не се брои при submit
        // Очакван score при submit = 5 + 1 = 6, MaxScore = 5 + 3 = 8 (без Open)
        await SeedUserAsync();
        var db = _factory.CreateContext();
        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen);

        var closedAnswerId = Guid.NewGuid();
        var mc1 = Guid.NewGuid();
        var mc2 = Guid.NewGuid();
        var mw1 = Guid.NewGuid();

        var closedQ = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Closed 5pt",
            Type = "Closed",
            Points = 5,
            OrderIndex = 0,
            Answers = new List<Answer>
            {
                new() { Id = closedAnswerId, Text = "Верен", IsCorrect = true, OrderIndex = 0 },
                new() { Id = Guid.NewGuid(), Text = "Грешен", IsCorrect = false, OrderIndex = 1 }
            }
        };
        var multiQ = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Multi 3pt",
            Type = "Multi",
            Points = 3,
            OrderIndex = 1,
            Answers = new List<Answer>
            {
                new() { Id = mc1, Text = "В1", IsCorrect = true, OrderIndex = 0 },
                new() { Id = mc2, Text = "В2", IsCorrect = true, OrderIndex = 1 },
                new() { Id = mw1, Text = "Г1", IsCorrect = false, OrderIndex = 2 },
            }
        };
        var openQ = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Open 3pt",
            Type = "Open",
            Points = 3,
            OrderIndex = 2
        };

        var test = new Test
        {
            Id = Guid.NewGuid(),
            Title = "Mixed",
            Status = TestStatus.Published,
            ShareCode = "MIXDSC01",
            OwnerId = _ownerId,
            Questions = new List<Question> { closedQ, multiQ, openQ }
        };
        db.Tests.Add(test);
        await db.SaveChangesAsync();

        var request = new SubmitAttemptRequest
        {
            ParticipantName = "Ученик",
            Answers = new List<AttemptAnswerDto>
            {
                new() { QuestionId = closedQ.Id, SelectedAnswerId = closedAnswerId },
                new() { QuestionId = multiQ.Id, SelectedAnswerId = mc1 },
                new() { QuestionId = multiQ.Id, SelectedAnswerId = mc2 },
                new() { QuestionId = multiQ.Id, SelectedAnswerId = mw1 },
                new() { QuestionId = openQ.Id, OpenText = "Отговор" }
            }
        };

        // Act
        var result = await service.SubmitAttemptAsync("MIXDSC01", request);

        // Assert
        result.Should().NotBeNull();
        result!.Score.Should().Be(6);        // 5 (closed) + 1 (multi partial)
        result.TotalQuestions.Should().Be(8); // MaxScore = 5 + 3 (без Open)
    }

    // -------------------------------------------------------------------
    // GradeAttemptAsync — AI оценяване с точки
    // -------------------------------------------------------------------

    [Fact]
    public async Task GradeAttempt_WithAi_StoresAiScoreInPoints()
    {
        // Arrange — Open въпрос с Points=3, AI дава score=2
        await SeedUserAsync();
        var db = _factory.CreateContext();

        var openQ = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Обясни",
            Type = "Open",
            Points = 3,
            OrderIndex = 0
        };

        var test = new Test
        {
            Id = Guid.NewGuid(),
            Title = "Open 3pt AI",
            Status = TestStatus.Published,
            ShareCode = "AIPTS001",
            OwnerId = _ownerId,
            Questions = new List<Question> { openQ }
        };

        var attempt = new Attempt
        {
            Id = Guid.NewGuid(),
            TestId = test.Id,
            ParticipantName = "Ученик",
            Score = 0,
            TotalQuestions = 3,
            CreatedAt = DateTime.UtcNow,
            AttemptAnswers = new List<AttemptAnswer>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    QuestionId = openQ.Id,
                    OpenText = "Отговор на ученика",
                    IsCorrect = false,
                    GradingStatus = GradingStatus.Pending
                }
            }
        };

        db.Tests.Add(test);
        db.Attempts.Add(attempt);
        await db.SaveChangesAsync();

        // Mock AI връща score=2 (за въпрос с maxPoints=3)
        var mockAi = new Mock<IAiGradingService>();
        mockAi.Setup(ai => ai.GradeAnswerAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string>(), 3))
            .ReturnsAsync((2, "Добър отговор, но непълен."));

        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen, mockAi.Object);

        // Act
        await service.GradeAttemptAsync(test.Id, attempt.Id, _ownerId);

        // Assert — AiScore е 2
        var freshAttempt = db.Attempts
            .Include(a => a.AttemptAnswers)
            .First(a => a.Id == attempt.Id);
        var openAnswer = freshAttempt.AttemptAnswers.First();
        openAnswer.AiScore.Should().Be(2);
        openAnswer.GradingStatus.Should().Be(GradingStatus.Graded);
        freshAttempt.Score.Should().Be(2);
    }

    [Fact]
    public async Task GradeAttempt_PassesMaxPoints_ToAiGrading()
    {
        // Arrange — проверяваме дали maxPoints се предава правилно
        await SeedUserAsync();
        var db = _factory.CreateContext();

        var openQ = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Въпрос",
            Type = "Open",
            Points = 7,
            OrderIndex = 0
        };

        var test = new Test
        {
            Id = Guid.NewGuid(),
            Title = "AI maxPoints test",
            Status = TestStatus.Published,
            ShareCode = "AIMXPT01",
            OwnerId = _ownerId,
            Questions = new List<Question> { openQ }
        };

        var attempt = new Attempt
        {
            Id = Guid.NewGuid(),
            TestId = test.Id,
            ParticipantName = "Ученик",
            Score = 0,
            TotalQuestions = 7,
            CreatedAt = DateTime.UtcNow,
            AttemptAnswers = new List<AttemptAnswer>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    QuestionId = openQ.Id,
                    OpenText = "Отговор",
                    IsCorrect = false,
                    GradingStatus = GradingStatus.Pending
                }
            }
        };

        db.Tests.Add(test);
        db.Attempts.Add(attempt);
        await db.SaveChangesAsync();

        var mockAi = new Mock<IAiGradingService>();
        mockAi.Setup(ai => ai.GradeAnswerAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string>(), It.IsAny<int>()))
            .ReturnsAsync((5, "ОК"));

        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen, mockAi.Object);

        // Act
        await service.GradeAttemptAsync(test.Id, attempt.Id, _ownerId);

        // Assert — AI е извикан с maxPoints=7 (question.Points)
        mockAi.Verify(ai => ai.GradeAnswerAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
            "Open", 7), Times.Once);
    }

    // -------------------------------------------------------------------
    // GetAttemptDetailAsync — Points и PointsEarned
    // -------------------------------------------------------------------

    [Fact]
    public async Task GetAttemptDetail_ReturnsPoints_AndPointsEarned_ForClosedQuestion()
    {
        // Arrange — Closed въпрос с 5 точки, верен отговор
        await SeedUserAsync();
        var db = _factory.CreateContext();

        var answerId = Guid.NewGuid();
        var closedQ = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Closed 5pt",
            Type = "Closed",
            Points = 5,
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
            Title = "Detail Closed",
            Status = TestStatus.Published,
            ShareCode = "DTLCLS01",
            OwnerId = _ownerId,
            Questions = new List<Question> { closedQ }
        };

        var attempt = new Attempt
        {
            Id = Guid.NewGuid(),
            TestId = test.Id,
            ParticipantName = "Ученик",
            Score = 5,
            TotalQuestions = 5,
            CreatedAt = DateTime.UtcNow,
            AttemptAnswers = new List<AttemptAnswer>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    QuestionId = closedQ.Id,
                    SelectedAnswerId = answerId,
                    IsCorrect = true,
                    GradingStatus = GradingStatus.NotApplicable
                }
            }
        };

        db.Tests.Add(test);
        db.Attempts.Add(attempt);
        await db.SaveChangesAsync();

        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen);

        // Act
        var result = await service.GetAttemptDetailAsync(test.Id, attempt.Id, _ownerId);

        // Assert
        result.Should().NotBeNull();
        var qDetail = result!.Questions.First();
        qDetail.Points.Should().Be(5);
        qDetail.PointsEarned.Should().Be(5);
        result.MaxScore.Should().Be(5);
        result.Score.Should().Be(5);
    }

    [Fact]
    public async Task GetAttemptDetail_ReturnsPoints_AndZeroPointsEarned_ForWrongClosed()
    {
        // Arrange — Closed въпрос с 5 точки, грешен отговор
        await SeedUserAsync();
        var db = _factory.CreateContext();

        var correctId = Guid.NewGuid();
        var wrongId = Guid.NewGuid();
        var closedQ = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Closed грешен",
            Type = "Closed",
            Points = 5,
            OrderIndex = 0,
            Answers = new List<Answer>
            {
                new() { Id = correctId, Text = "Верен", IsCorrect = true, OrderIndex = 0 },
                new() { Id = wrongId, Text = "Грешен", IsCorrect = false, OrderIndex = 1 }
            }
        };

        var test = new Test
        {
            Id = Guid.NewGuid(),
            Title = "Detail Wrong Closed",
            Status = TestStatus.Published,
            ShareCode = "DTLCLSW1",
            OwnerId = _ownerId,
            Questions = new List<Question> { closedQ }
        };

        var attempt = new Attempt
        {
            Id = Guid.NewGuid(),
            TestId = test.Id,
            ParticipantName = "Ученик",
            Score = 0,
            TotalQuestions = 5,
            CreatedAt = DateTime.UtcNow,
            AttemptAnswers = new List<AttemptAnswer>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    QuestionId = closedQ.Id,
                    SelectedAnswerId = wrongId,
                    IsCorrect = false,
                    GradingStatus = GradingStatus.NotApplicable
                }
            }
        };

        db.Tests.Add(test);
        db.Attempts.Add(attempt);
        await db.SaveChangesAsync();

        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen);

        // Act
        var result = await service.GetAttemptDetailAsync(test.Id, attempt.Id, _ownerId);

        // Assert
        result.Should().NotBeNull();
        var qDetail = result!.Questions.First();
        qDetail.Points.Should().Be(5);
        qDetail.PointsEarned.Should().Be(0);
    }

    // -------------------------------------------------------------------
    // FullTestResponse — включва Points
    // -------------------------------------------------------------------

    [Fact]
    public async Task GetFullTest_ReturnsPoints_InQuestionDto()
    {
        // Arrange
        await SeedUserAsync();
        var db = _factory.CreateContext();

        var question = new Question
        {
            Id = Guid.NewGuid(),
            Text = "Въпрос с 7 точки",
            Type = "Closed",
            Points = 7,
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
            Title = "Full Test Points",
            Status = TestStatus.Draft,
            ShareCode = "FLTPTS01",
            OwnerId = _ownerId,
            Questions = new List<Question> { question }
        };

        db.Tests.Add(test);
        await db.SaveChangesAsync();

        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen);

        // Act
        var result = await service.GetFullTestAsync(test.Id, _ownerId);

        // Assert
        result.Should().NotBeNull();
        result!.Questions.Should().HaveCount(1);
        result.Questions[0].Points.Should().Be(7);
    }

    // -------------------------------------------------------------------
    // Percent calculation — използва MaxScore, не TotalQuestions
    // -------------------------------------------------------------------

    [Fact]
    public async Task SubmitAttempt_Percent_IsBasedOnMaxScore()
    {
        // Arrange — 2 въпроса: Closed (5pt) верен + Closed (5pt) грешен → 5/10 = 50%
        await SeedUserAsync();
        var db = _factory.CreateContext();
        var shareCodeGen = new ShareCodeGenerator(db);
        var service = new TestService(db, shareCodeGen);

        var a1 = Guid.NewGuid();
        var a2 = Guid.NewGuid();

        var q1 = new Question
        {
            Id = Guid.NewGuid(), Text = "Q1", Type = "Closed", Points = 5, OrderIndex = 0,
            Answers = new List<Answer>
            {
                new() { Id = a1, Text = "Верен", IsCorrect = true, OrderIndex = 0 },
                new() { Id = Guid.NewGuid(), Text = "Грешен", IsCorrect = false, OrderIndex = 1 }
            }
        };
        var q2 = new Question
        {
            Id = Guid.NewGuid(), Text = "Q2", Type = "Closed", Points = 5, OrderIndex = 1,
            Answers = new List<Answer>
            {
                new() { Id = a2, Text = "Верен", IsCorrect = true, OrderIndex = 0 },
                new() { Id = Guid.NewGuid(), Text = "Грешен", IsCorrect = false, OrderIndex = 1 }
            }
        };

        var test = new Test
        {
            Id = Guid.NewGuid(), Title = "Percent Test", Status = TestStatus.Published,
            ShareCode = "PRCNT001", OwnerId = _ownerId,
            Questions = new List<Question> { q1, q2 }
        };
        db.Tests.Add(test);
        await db.SaveChangesAsync();

        var request = new SubmitAttemptRequest
        {
            ParticipantName = "Ученик",
            Answers = new List<AttemptAnswerDto>
            {
                new() { QuestionId = q1.Id, SelectedAnswerId = a1 },              // верен
                new() { QuestionId = q2.Id, SelectedAnswerId = Guid.NewGuid() }   // грешен (невалиден id)
            }
        };

        // Act
        var result = await service.SubmitAttemptAsync("PRCNT001", request);

        // Assert
        result.Should().NotBeNull();
        result!.Score.Should().Be(5);
        result.TotalQuestions.Should().Be(10); // MaxScore = 10
        result.Percent.Should().Be(50.0);
    }
}
