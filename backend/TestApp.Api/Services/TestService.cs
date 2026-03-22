// Стъпка 30 — TestService.cs
// Услуга за управление на тестове, въпроси и опити
using Microsoft.EntityFrameworkCore;
using TestApp.Api.Data;
using TestApp.Api.Dtos.Tests;
using TestApp.Api.Models;

namespace TestApp.Api.Services;

public class TestService : ITestService
{
    private readonly AppDbContext _db;
    private readonly IShareCodeGenerator _shareCodeGenerator;

    public TestService(AppDbContext db, IShareCodeGenerator shareCodeGenerator)
    {
        _db = db;
        _shareCodeGenerator = shareCodeGenerator;
    }

    // Връща всички тестове на конкретен собственик
    public async Task<List<TestListItem>> GetTestsByOwnerAsync(Guid ownerId)
    {
        return await _db.Tests
            .Where(t => t.OwnerId == ownerId)
            .Select(t => new TestListItem
            {
                Id = t.Id,
                Title = t.Title,
                Status = t.Status.ToString(),
                QuestionsCount = t.Questions.Count,
                AttemptsCount = t.Attempts.Count,
                CreatedAt = t.CreatedAt,
                ShareCode = t.ShareCode
            })
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();
    }

    // Създава нов тест с въпроси и категории
    public async Task<TestListItem> CreateTestAsync(CreateTestRequest request, Guid ownerId)
    {
        // Валидира броя въпроси
        if (request.Questions == null || request.Questions.Count == 0)
            throw new InvalidOperationException("Тестът трябва да съдържа поне 1 въпрос.");

        // Валидира че всеки въпрос има точно 1 верен отговор
        foreach (var q in request.Questions)
        {
            if (!q.Answers.Any(a => a.IsCorrect))
                throw new InvalidOperationException($"Въпросът '{q.Text}' няма верен отговор.");
        }

        // Генерира уникален код за споделяне
        string shareCode = await _shareCodeGenerator.GenerateAsync();

        // Създава въпросите и отговорите (нов обект - immutable pattern)
        var questions = request.Questions
            .Select((q, qIndex) => new Question
            {
                Id = Guid.NewGuid(),
                Text = q.Text,
                OrderIndex = qIndex,
                Answers = q.Answers
                    .Select((a, aIndex) => new Answer
                    {
                        Id = Guid.NewGuid(),
                        Text = a.Text,
                        IsCorrect = a.IsCorrect,
                        OrderIndex = aIndex
                    })
                    .ToList()
            })
            .ToList();

        // Валидира и намиран само съществуващи категории
        var categoryGuids = request.CategoryIds
            .Where(id => Guid.TryParse(id, out _))
            .Select(Guid.Parse)
            .ToList();

        if (categoryGuids.Count > 0)
        {
            var existingCategoryIds = await _db.Categories
                .Where(c => categoryGuids.Contains(c.Id))
                .Select(c => c.Id)
                .ToListAsync();

            var missingIds = categoryGuids.Except(existingCategoryIds).ToList();
            if (missingIds.Count > 0)
                throw new InvalidOperationException(
                    $"Категории не са намерени: {string.Join(", ", missingIds)}");
        }

        var testCategories = categoryGuids
            .Select(categoryId => new TestCategory { CategoryId = categoryId })
            .ToList();

        // Създава новия тест (нов обект - immutable pattern)
        var test = new Test
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            Description = request.Description,
            Duration = request.Duration,
            Status = TestStatus.Draft,
            ShareCode = shareCode,
            OwnerId = ownerId,
            CreatedAt = DateTime.UtcNow,
            Questions = questions,
            TestCategories = testCategories
        };

        _db.Tests.Add(test);
        await _db.SaveChangesAsync();

        return new TestListItem
        {
            Id = test.Id,
            Title = test.Title,
            Status = test.Status.ToString(),
            QuestionsCount = test.Questions.Count,
            AttemptsCount = 0,
            CreatedAt = test.CreatedAt,
            ShareCode = test.ShareCode
        };
    }

    // Помощен метод: зарежда Published тест по shareCode (само за четене)
    private async Task<Test?> GetPublishedTestByShareCodeAsync(string shareCode)
    {
        return await _db.Tests
            .AsNoTracking()
            .Include(t => t.Questions)
                .ThenInclude(q => q.Answers)
            .FirstOrDefaultAsync(t => t.ShareCode == shareCode && t.Status == TestStatus.Published);
    }

    // Връща публичен изглед на тест (само Published, БЕЗ IsCorrect)
    public async Task<PublicTestResponse?> GetPublicTestAsync(string shareCode)
    {
        var test = await GetPublishedTestByShareCodeAsync(shareCode);

        if (test is null)
        {
            return null;
        }

        // Връща само публична информация - НИКОГА не включва IsCorrect
        return new PublicTestResponse
        {
            ShareCode = test.ShareCode,
            Title = test.Title,
            Description = test.Description,
            Duration = test.Duration,
            Questions = test.Questions
                .OrderBy(q => q.OrderIndex)
                .Select(q => new PublicQuestionDto
                {
                    Id = q.Id,
                    Text = q.Text,
                    Answers = q.Answers
                        .OrderBy(a => a.OrderIndex)
                        .Select(a => new PublicAnswerDto
                        {
                            Id = a.Id,
                            Text = a.Text
                            // IsCorrect умишлено НЕ се включва
                        })
                        .ToList()
                })
                .ToList()
        };
    }

    // Връща пълен изглед на тест само ако ownerId съвпада
    public async Task<FullTestResponse?> GetFullTestAsync(Guid testId, Guid ownerId)
    {
        var test = await _db.Tests
            .AsNoTracking()
            .Include(t => t.Questions)
                .ThenInclude(q => q.Answers)
            .FirstOrDefaultAsync(t => t.Id == testId && t.OwnerId == ownerId);

        if (test is null)
        {
            return null;
        }

        return new FullTestResponse
        {
            Id = test.Id,
            ShareCode = test.ShareCode,
            Title = test.Title,
            Description = test.Description,
            Duration = test.Duration,
            Status = test.Status.ToString(),
            CreatedAt = test.CreatedAt,
            Questions = test.Questions
                .OrderBy(q => q.OrderIndex)
                .Select(q => new FullQuestionDto
                {
                    Id = q.Id,
                    Text = q.Text,
                    OrderIndex = q.OrderIndex,
                    Answers = q.Answers
                        .OrderBy(a => a.OrderIndex)
                        .Select(a => new FullAnswerDto
                        {
                            Id = a.Id,
                            Text = a.Text,
                            IsCorrect = a.IsCorrect,
                            OrderIndex = a.OrderIndex
                        })
                        .ToList()
                })
                .ToList()
        };
    }

    // Предава опит и изчислява резултата
    public async Task<AttemptResultResponse?> SubmitAttemptAsync(string shareCode, SubmitAttemptRequest request)
    {
        // Зарежда теста чрез споделен помощен метод (Published само)
        // AsNoTracking не се ползва тук — нужно е tracking за SaveChangesAsync
        var test = await _db.Tests
            .Include(t => t.Questions)
                .ThenInclude(q => q.Answers)
            .FirstOrDefaultAsync(t => t.ShareCode == shareCode && t.Status == TestStatus.Published);

        if (test is null)
        {
            return null;
        }

        // Изчислява резултата и записва AttemptAnswers
        var attemptAnswers = new List<AttemptAnswer>();
        int score = 0;

        var questionResults = test.Questions
            .OrderBy(q => q.OrderIndex)
            .Select(question =>
            {
                // Намира избрания отговор за въпроса
                var submitted = request.Answers
                    .FirstOrDefault(a => a.QuestionId == question.Id);

                Guid? selectedAnswerId = submitted?.SelectedAnswerId;

                // Проверява дали избраният отговор принадлежи на ТОЗИ въпрос
                bool answerBelongsToQuestion = selectedAnswerId.HasValue
                    && question.Answers.Any(a => a.Id == selectedAnswerId.Value);

                // Нулира selectedAnswerId ако не принадлежи на въпроса (предотвратява инжекция)
                Guid? validatedAnswerId = answerBelongsToQuestion ? selectedAnswerId : null;

                // Проверява дали валидираният отговор е верен
                bool isCorrect = validatedAnswerId.HasValue
                    && question.Answers.Any(a => a.Id == validatedAnswerId.Value && a.IsCorrect);

                return new
                {
                    Question = question,
                    SelectedAnswerId = validatedAnswerId,
                    IsCorrect = isCorrect
                };
            })
            .ToList();

        // Брои верните отговори
        score = questionResults.Count(r => r.IsCorrect);

        // Създава AttemptAnswer записи
        var attemptAnswersList = questionResults
            .Select(r => new AttemptAnswer
            {
                Id = Guid.NewGuid(),
                QuestionId = r.Question.Id,
                SelectedAnswerId = r.SelectedAnswerId,
                IsCorrect = r.IsCorrect
            })
            .ToList();

        // Записва опита в базата данни (нов обект - immutable pattern)
        var attempt = new Attempt
        {
            Id = Guid.NewGuid(),
            ParticipantName = request.ParticipantName,
            Score = score,
            TotalQuestions = test.Questions.Count,
            TestId = test.Id,
            CreatedAt = DateTime.UtcNow,
            AttemptAnswers = attemptAnswersList
        };

        _db.Attempts.Add(attempt);
        await _db.SaveChangesAsync();

        // Изчислява процента
        double percent = test.Questions.Count > 0
            ? Math.Round((double)score / test.Questions.Count * 100, 2)
            : 0;

        return new AttemptResultResponse
        {
            Score = score,
            TotalQuestions = test.Questions.Count,
            Percent = percent,
            Results = questionResults
                .Select(r => new AttemptQuestionResult
                {
                    QuestionId = r.Question.Id,
                    QuestionText = r.Question.Text,
                    SelectedAnswerId = r.SelectedAnswerId,
                    IsCorrect = r.IsCorrect
                })
                .ToList()
        };
    }

    // Връща обобщените резултати на опитите за даден тест (само ако ownerId съвпада)
    public async Task<List<AttemptSummary>> GetAttemptsByTestAsync(Guid testId, Guid ownerId)
    {
        // Проверява дали тестът принадлежи на собственика
        var testExists = await _db.Tests.AnyAsync(t => t.Id == testId && t.OwnerId == ownerId);
        if (!testExists) return new List<AttemptSummary>();

        return await _db.Attempts
            .AsNoTracking()
            .Where(a => a.TestId == testId)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new AttemptSummary
            {
                Id = a.Id,
                ParticipantName = a.ParticipantName,
                Score = a.Score,
                TotalQuestions = a.TotalQuestions,
                Percent = a.TotalQuestions > 0
                    ? Math.Round((double)a.Score / a.TotalQuestions * 100, 2)
                    : 0,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();
    }
}
