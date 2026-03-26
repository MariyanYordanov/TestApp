// Стъпка 30 — TestService.cs
// Услуга за управление на тестове, въпроси и опити
using Microsoft.EntityFrameworkCore;
using TestApp.Api.Data;
using TestApp.Api.Dtos.Tests;
using TestApp.Api.Models;
using TestApp.Api.Models.Enums;

namespace TestApp.Api.Services;

public class TestService : ITestService
{
    private readonly AppDbContext _db;
    private readonly IShareCodeGenerator _shareCodeGenerator;
    private readonly IAiGradingService? _aiGrading;

    public TestService(AppDbContext db, IShareCodeGenerator shareCodeGenerator, IAiGradingService? aiGrading = null)
    {
        _db = db;
        _shareCodeGenerator = shareCodeGenerator;
        _aiGrading = aiGrading;
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

        // Валидира отговорите само за Closed и Multi въпроси (Open и Code нямат отговори)
        foreach (var q in request.Questions)
        {
            if (q.Type == "Open" || q.Type == "Code")
            {
                if (q.Answers.Any())
                    throw new InvalidOperationException(
                        $"Въпросът '{q.Text}' от тип {q.Type} не трябва да има отговори.");

                // Проверява дължината на примерния отговор спрямо типа
                int maxSampleLen = q.Type == "Code" ? 50000 : 10000;
                if (q.SampleAnswer?.Length > maxSampleLen)
                    throw new InvalidOperationException(
                        $"Примерният отговор на въпрос '{q.Text}' надвишава {maxSampleLen} символа.");

                continue;
            }
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
                Type = q.Type,
                OrderIndex = qIndex,
                SampleAnswer = (q.Type == "Open" || q.Type == "Code") ? q.SampleAnswer : null,
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
                    Type = q.Type,
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
                    Type = q.Type,
                    OrderIndex = q.OrderIndex,
                    SampleAnswer = q.SampleAnswer,
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
        // Open въпросите не се оценяват автоматично — изключват се от score
        var questionResults = test.Questions
            .OrderBy(q => q.OrderIndex)
            .Select(question =>
            {
                // Open и Code въпросите нямат отговори — маркираме като неоценени
                if (question.Type == "Open" || question.Type == "Code")
                {
                    var openAnswer = request.Answers
                        .FirstOrDefault(a => a.QuestionId == question.Id);
                    return new
                    {
                        Question = question,
                        SelectedAnswerId = (Guid?)null,
                        OpenText = openAnswer?.OpenText,
                        IsCorrect = false,
                        Scorable = false
                    };
                }

                // Събира всички изпратени отговори за въпроса
                var submittedIds = request.Answers
                    .Where(a => a.QuestionId == question.Id && a.SelectedAnswerId.HasValue)
                    .Select(a => a.SelectedAnswerId!.Value)
                    .ToList();

                // Валидира — запазва само отговори, принадлежащи на ТОЗИ въпрос (предотвратява инжекция)
                var validatedIds = submittedIds
                    .Where(id => question.Answers.Any(a => a.Id == id))
                    .ToList();

                bool isCorrect;
                if (question.Type == "Multi")
                {
                    // Multi: трябва точно да съвпадат всички верни отговори (нито повече, нито по-малко)
                    var correctIds = question.Answers
                        .Where(a => a.IsCorrect)
                        .Select(a => a.Id)
                        .ToHashSet();
                    isCorrect = validatedIds.Count > 0
                        && new HashSet<Guid>(validatedIds).SetEquals(correctIds);
                }
                else
                {
                    // Closed: точно един отговор, трябва да е верен
                    var singleId = validatedIds.FirstOrDefault();
                    isCorrect = singleId != default
                        && question.Answers.Any(a => a.Id == singleId && a.IsCorrect);
                }

                return new
                {
                    Question = question,
                    SelectedAnswerId = validatedIds.FirstOrDefault() == default ? (Guid?)null : (Guid?)validatedIds.First(),
                    OpenText = (string?)null,
                    IsCorrect = isCorrect,
                    Scorable = true
                };
            })
            .ToList();

        // Брои верните отговори само от scorable въпроси
        int score = questionResults.Count(r => r.IsCorrect && r.Scorable);
        int scorableTotal = questionResults.Count(r => r.Scorable);

        // Създава AttemptAnswer записи
        var attemptAnswersList = questionResults
            .Select(r =>
            {
                // Open и Code въпроси се маркират като Pending за AI оценяване
                var gradingStatus = (r.Question.Type == "Open" || r.Question.Type == "Code")
                    ? GradingStatus.Pending
                    : GradingStatus.NotApplicable;

                return new AttemptAnswer
                {
                    Id = Guid.NewGuid(),
                    QuestionId = r.Question.Id,
                    SelectedAnswerId = r.SelectedAnswerId,
                    OpenText = r.OpenText,
                    IsCorrect = r.IsCorrect,
                    GradingStatus = gradingStatus
                };
            })
            .ToList();

        // Записва опита в базата данни (нов обект - immutable pattern)
        var attempt = new Attempt
        {
            Id = Guid.NewGuid(),
            ParticipantName = request.ParticipantName,
            Score = score,
            TotalQuestions = scorableTotal,
            TestId = test.Id,
            CreatedAt = DateTime.UtcNow,
            AttemptAnswers = attemptAnswersList
        };

        _db.Attempts.Add(attempt);
        await _db.SaveChangesAsync();

        // Изчислява процента спрямо оценяемите въпроси
        double percent = scorableTotal > 0
            ? Math.Round((double)score / scorableTotal * 100, 2)
            : 0;

        return new AttemptResultResponse
        {
            Score = score,
            TotalQuestions = scorableTotal,
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

    // Обновява съществуващ тест — заменя въпросите, отговорите и категориите изцяло
    public async Task<TestListItem?> UpdateTestAsync(Guid testId, CreateTestRequest request, Guid ownerId)
    {
        // Зарежда теста с въпроси, отговори и категории (с tracking за промени)
        var test = await _db.Tests
            .Include(t => t.Questions)
                .ThenInclude(q => q.Answers)
            .Include(t => t.TestCategories)
            .FirstOrDefaultAsync(t => t.Id == testId && t.OwnerId == ownerId);

        if (test is null) return null;

        // Валидира въпросите (същите правила като при създаване)
        if (request.Questions == null || request.Questions.Count == 0)
            throw new InvalidOperationException("Тестът трябва да съдържа поне 1 въпрос.");

        foreach (var q in request.Questions)
        {
            if (q.Type == "Open" || q.Type == "Code")
            {
                if (q.Answers.Any())
                    throw new InvalidOperationException(
                        $"Въпросът '{q.Text}' от тип {q.Type} не трябва да има отговори.");

                int maxSampleLen = q.Type == "Code" ? 50000 : 10000;
                if (q.SampleAnswer?.Length > maxSampleLen)
                    throw new InvalidOperationException(
                        $"Примерният отговор на въпрос '{q.Text}' надвишава {maxSampleLen} символа.");

                continue;
            }
            if (!q.Answers.Any(a => a.IsCorrect))
                throw new InvalidOperationException($"Въпросът '{q.Text}' няма верен отговор.");
        }

        // Обновява основните полета
        test.Title = request.Title;
        test.Description = request.Description;
        test.Duration = request.Duration;

        // Валидира новите категории преди да започнем промените
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

        // Стъпка 1: Нулира FK референциите в AttemptAnswers към старите отговори,
        // защото FK е NO ACTION и директното изтриване на Answers ще фейлне.
        var oldAnswerIds = test.Questions
            .SelectMany(q => q.Answers)
            .Select(a => a.Id)
            .ToList();

        if (oldAnswerIds.Count > 0)
        {
            await _db.AttemptAnswers
                .Where(aa => aa.SelectedAnswerId.HasValue
                             && oldAnswerIds.Contains(aa.SelectedAnswerId.Value))
                .ExecuteUpdateAsync(s =>
                    s.SetProperty(aa => aa.SelectedAnswerId, (Guid?)null));
        }

        // Стъпка 2: Изтрива старите въпроси, отговори и категории
        _db.Questions.RemoveRange(test.Questions);
        _db.Set<TestCategory>().RemoveRange(test.TestCategories);
        await _db.SaveChangesAsync();

        // Стъпка 2: Добавя новите въпроси, отговори и категории
        var newQuestions = request.Questions
            .Select((q, qIndex) => new Question
            {
                Id = Guid.NewGuid(),
                Text = q.Text,
                Type = q.Type,
                OrderIndex = qIndex,
                TestId = testId,
                SampleAnswer = (q.Type == "Open" || q.Type == "Code") ? q.SampleAnswer : null,
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

        _db.Questions.AddRange(newQuestions);

        var newCategories = categoryGuids
            .Select(categoryId => new TestCategory { TestId = testId, CategoryId = categoryId })
            .ToList();

        _db.Set<TestCategory>().AddRange(newCategories);

        await _db.SaveChangesAsync();

        return new TestListItem
        {
            Id = test.Id,
            Title = test.Title,
            Status = test.Status.ToString(),
            QuestionsCount = newQuestions.Count,
            AttemptsCount = await _db.Attempts.CountAsync(a => a.TestId == testId),
            CreatedAt = test.CreatedAt,
            ShareCode = test.ShareCode
        };
    }

    // Изтрива тест (само ако ownerId съвпада)
    public async Task<bool> DeleteTestAsync(Guid testId, Guid ownerId)
    {
        var test = await _db.Tests
            .FirstOrDefaultAsync(t => t.Id == testId && t.OwnerId == ownerId);

        if (test is null) return false;

        _db.Tests.Remove(test);
        await _db.SaveChangesAsync();
        return true;
    }

    // Публикува тест (Draft → Published)
    public async Task<bool> PublishTestAsync(Guid testId, Guid ownerId)
    {
        var test = await _db.Tests
            .FirstOrDefaultAsync(t => t.Id == testId && t.OwnerId == ownerId);

        if (test is null) return false;

        test.Status = TestStatus.Published;
        await _db.SaveChangesAsync();
        return true;
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

    // Връща детайлен преглед на опит — учителят вижда всеки въпрос и отговора на ученика
    public async Task<AttemptDetailResponse?> GetAttemptDetailAsync(Guid testId, Guid attemptId, Guid ownerId)
    {
        // Проверява собствеността на теста
        var test = await _db.Tests
            .Include(t => t.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Answers.OrderBy(a => a.OrderIndex))
            .FirstOrDefaultAsync(t => t.Id == testId && t.OwnerId == ownerId);

        if (test is null) return null;

        var attempt = await _db.Attempts
            .Include(a => a.AttemptAnswers)
            .FirstOrDefaultAsync(a => a.Id == attemptId && a.TestId == testId);

        if (attempt is null) return null;

        // Изгражда детайли за всеки въпрос
        var questions = test.Questions.Select(q =>
        {
            var myAnswers = attempt.AttemptAnswers.Where(aa => aa.QuestionId == q.Id).ToList();
            var selectedIds = myAnswers
                .Where(aa => aa.SelectedAnswerId.HasValue)
                .Select(aa => aa.SelectedAnswerId!.Value)
                .ToHashSet();
            var firstAnswer = myAnswers.FirstOrDefault();
            var openText = firstAnswer?.OpenText;
            var gradingStatus = firstAnswer?.GradingStatus ?? GradingStatus.NotApplicable;
            var isCorrect = firstAnswer?.IsCorrect;
            var aiFeedback = firstAnswer?.AiFeedback;
            var aiScore = firstAnswer?.AiScore;

            return new AttemptQuestionDetail
            {
                QuestionId = q.Id,
                QuestionText = q.Text,
                QuestionType = q.Type,
                Scorable = q.Type != "Open" && q.Type != "Code",
                SampleAnswer = q.SampleAnswer,
                Answers = q.Answers.Select(a => new AttemptAnswerDetail
                {
                    AnswerId = a.Id,
                    Text = a.Text,
                    IsCorrect = a.IsCorrect,
                    WasSelected = selectedIds.Contains(a.Id),
                }).ToList(),
                OpenText = openText,
                IsCorrect = isCorrect,
                GradingStatus = gradingStatus.ToString(),
                AiFeedback = aiFeedback,
                AiScore = aiScore,
            };
        }).ToList();

        // Изчислява резултата
        var correctScorable = questions.Count(q => q.Scorable && q.IsCorrect == true);
        var aiCorrect = questions.Count(q => !q.Scorable && q.GradingStatus == "Graded" && q.AiScore > 0);
        var gradedOpenCount = questions.Count(q => !q.Scorable && q.GradingStatus == "Graded");
        var scorableCount = questions.Count(q => q.Scorable);
        var totalForPercent = scorableCount + gradedOpenCount;
        var correctTotal = correctScorable + aiCorrect;

        var hasOpen = questions.Any(q => !q.Scorable);
        var allGraded = !hasOpen || questions.Where(q => !q.Scorable).All(q => q.GradingStatus == "Graded");

        return new AttemptDetailResponse
        {
            AttemptId = attempt.Id,
            ParticipantName = attempt.ParticipantName,
            ParticipantGroup = null, // Attempt entity няма ParticipantGroup в текущия модел
            StartedAt = attempt.CreatedAt,
            FinishedAt = null,
            Score = correctTotal,
            TotalQuestions = totalForPercent > 0 ? totalForPercent : scorableCount,
            Percent = totalForPercent > 0 ? Math.Round((double)correctTotal / totalForPercent * 100, 1) : 0,
            HasOpenAnswers = hasOpen,
            AllGraded = allGraded,
            Questions = questions,
        };
    }

    // Стартира AI оценяване на всички Pending отговори в опит
    public async Task<bool> GradeAttemptAsync(Guid testId, Guid attemptId, Guid ownerId)
    {
        var test = await _db.Tests
            .Include(t => t.Questions)
                .ThenInclude(q => q.Answers)
            .FirstOrDefaultAsync(t => t.Id == testId && t.OwnerId == ownerId);

        if (test is null) return false;

        var attempt = await _db.Attempts
            .Include(a => a.AttemptAnswers)
            .FirstOrDefaultAsync(a => a.Id == attemptId && a.TestId == testId);

        if (attempt is null) return false;

        var pendingAnswers = attempt.AttemptAnswers
            .Where(aa => aa.GradingStatus == GradingStatus.Pending)
            .ToList();

        if (_aiGrading is null)
        {
            // AI услугата не е конфигурирана — маркира като Failed
            foreach (var aa in pendingAnswers)
            {
                aa.GradingStatus = GradingStatus.Failed;
                aa.AiFeedback = "AI оценяването не е конфигурирано.";
            }
            await _db.SaveChangesAsync();
            return true;
        }

        // Оценява всеки Pending отговор с AI
        foreach (var aa in pendingAnswers)
        {
            var question = test.Questions.FirstOrDefault(q => q.Id == aa.QuestionId);
            if (question is null) continue;

            try
            {
                var (score, feedback) = await _aiGrading.GradeAnswerAsync(
                    question.Text, question.SampleAnswer, aa.OpenText ?? "", question.Type);
                aa.GradingStatus = GradingStatus.Graded;
                aa.AiScore = score;
                aa.AiFeedback = feedback;
                aa.IsCorrect = score > 0;
                aa.GradedAt = DateTime.UtcNow;
            }
            catch
            {
                aa.GradingStatus = GradingStatus.Failed;
                aa.AiFeedback = "Грешка при автоматична проверка.";
            }
        }

        // Преизчислява резултата: оценяеми верни + AI верни
        var allAnswers = attempt.AttemptAnswers.ToList();
        var scorableQuestionIds = test.Questions
            .Where(q => q.Type != "Open" && q.Type != "Code")
            .Select(q => q.Id)
            .ToHashSet();

        var correctScorable = allAnswers
            .Where(aa => scorableQuestionIds.Contains(aa.QuestionId) && aa.IsCorrect)
            .Select(aa => aa.QuestionId)
            .Distinct()
            .Count();

        var aiCorrect = allAnswers.Count(aa =>
        {
            var q = test.Questions.FirstOrDefault(q => q.Id == aa.QuestionId);
            return q != null
                && (q.Type == "Open" || q.Type == "Code")
                && aa.GradingStatus == GradingStatus.Graded
                && aa.AiScore > 0;
        });

        attempt.Score = correctScorable + aiCorrect;

        await _db.SaveChangesAsync();
        return true;
    }
}
