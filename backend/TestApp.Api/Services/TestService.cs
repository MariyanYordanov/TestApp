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
    private readonly IStudentDirectoryService? _directory;
    private readonly ILogger<TestService>? _logger;

    public TestService(
        AppDbContext db,
        IShareCodeGenerator shareCodeGenerator,
        IAiGradingService? aiGrading = null,
        ILogger<TestService>? logger = null,
        IStudentDirectoryService? directory = null)
    {
        _db = db;
        _shareCodeGenerator = shareCodeGenerator;
        _aiGrading = aiGrading;
        _directory = directory;
        _logger = logger;
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
        // Валидира продължителността (мин 60 сек = 1 мин, макс 28800 сек = 480 мин)
        if (request.Duration < 60 || request.Duration > 28800)
            throw new InvalidOperationException("Продължителността трябва да е между 1 и 480 минути.");

        // Валидира броя въпроси
        if (request.Questions == null || request.Questions.Count == 0)
            throw new InvalidOperationException("Тестът трябва да съдържа поне 1 въпрос.");

        // Валидира всички въпроси:
        // - Closed/Multi: трябва да имат отговори с поне 1 верен
        // - Open/Code: НЕ трябва да имат отговори, но SampleAnswer (примерен отговор)
        //   се записва и се ползва от AI за сравнение с ученическия отговор
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
                Points = q.Points > 0 ? q.Points : ComputeDefaultPoints(q.Type, q.Answers),
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
            TargetClass = request.TargetClass,
            RequireEmailGate = request.RequireEmailGate,
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
            TargetClass = test.TargetClass,
            RequireEmailGate = test.RequireEmailGate,
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
                    Points = q.Points,
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

        // --- Email Gate логика ---
        string? resolvedParticipantName = request.ParticipantName;
        string? normalizedEmail = null;

        if (test.RequireEmailGate)
        {
            // Ако директорията не е достъпна — fail-open (пропускаме gate)
            bool directoryAvailable = _directory?.IsAvailable ?? false;

            if (directoryAvailable)
            {
                // Изискваме имейл
                if (string.IsNullOrWhiteSpace(request.ParticipantEmail))
                    return null;

                normalizedEmail = request.ParticipantEmail.Trim().ToLowerInvariant();

                // Търсим ученика в директорията
                var lookupResult = _directory!.FindByEmail(normalizedEmail);
                if (lookupResult is null)
                    return null;

                // Override ParticipantName от директорията
                resolvedParticipantName = lookupResult.FullName;

                // Проверяваме за съществуващ non-voided опит (single-attempt enforcement)
                bool alreadyAttempted = await _db.Attempts
                    .AnyAsync(a => a.TestId == test.Id
                                && a.ParticipantEmail == normalizedEmail
                                && !a.IsVoided);
                if (alreadyAttempted)
                    return null;
            }
        }

        // Изчислява резултата и записва AttemptAnswers
        // Open/Code въпросите не се оценяват автоматично — изключват се от началния score
        var attemptAnswersList = new List<AttemptAnswer>();
        int score = 0;
        int maxScore = 0;

        foreach (var question in test.Questions.OrderBy(q => q.OrderIndex))
        {
            bool isOpenLike = question.Type == "Open" || question.Type == "Code";

            if (isOpenLike)
            {
                // Open и Code: вземаме свободния текстов отговор, маркираме като Pending
                var openAnswer = request.Answers.FirstOrDefault(a => a.QuestionId == question.Id);
                attemptAnswersList.Add(new AttemptAnswer
                {
                    Id = Guid.NewGuid(),
                    QuestionId = question.Id,
                    OpenText = openAnswer?.OpenText,
                    IsCorrect = false,
                    GradingStatus = GradingStatus.Pending
                });
                // Точките на Open/Code се включват в maxScore от началото —
                // след AI оценяване Score ще се увеличи до правилната стойност
                maxScore += question.Points;
                continue;
            }

            // Събира и валидира изпратените AnswerId (защита от инжекция)
            var submittedIds = request.Answers
                .Where(a => a.QuestionId == question.Id && a.SelectedAnswerId.HasValue)
                .Select(a => a.SelectedAnswerId!.Value)
                .Where(id => question.Answers.Any(a => a.Id == id))
                .ToList();

            if (question.Type == "Multi")
            {
                // Частично точкуване: +1 за верен избор, -1 за грешен, min 0, cap question.Points
                int correctSelected = submittedIds.Count(id => question.Answers.Any(a => a.Id == id && a.IsCorrect));
                int wrongSelected = submittedIds.Count(id => question.Answers.Any(a => a.Id == id && !a.IsCorrect));
                int questionScore = Math.Max(0, Math.Min(question.Points, correctSelected - wrongSelected));
                score += questionScore;
                maxScore += question.Points;

                // Записва по един AttemptAnswer за всеки избран отговор
                if (submittedIds.Count > 0)
                {
                    foreach (var selectedId in submittedIds)
                    {
                        bool answerIsCorrect = question.Answers.Any(a => a.Id == selectedId && a.IsCorrect);
                        attemptAnswersList.Add(new AttemptAnswer
                        {
                            Id = Guid.NewGuid(),
                            QuestionId = question.Id,
                            SelectedAnswerId = selectedId,
                            IsCorrect = answerIsCorrect,
                            GradingStatus = GradingStatus.NotApplicable
                        });
                    }
                }
                else
                {
                    // Не е избран нито един отговор
                    attemptAnswersList.Add(new AttemptAnswer
                    {
                        Id = Guid.NewGuid(),
                        QuestionId = question.Id,
                        SelectedAnswerId = null,
                        IsCorrect = false,
                        GradingStatus = GradingStatus.NotApplicable
                    });
                }
            }
            else
            {
                // Closed: всичко или нищо — пълни точки при верен избор, 0 иначе
                var singleId = submittedIds.FirstOrDefault();
                bool isCorrect = singleId != default
                    && question.Answers.Any(a => a.Id == singleId && a.IsCorrect);
                score += isCorrect ? question.Points : 0;
                maxScore += question.Points;

                attemptAnswersList.Add(new AttemptAnswer
                {
                    Id = Guid.NewGuid(),
                    QuestionId = question.Id,
                    SelectedAnswerId = singleId == default ? null : singleId,
                    IsCorrect = isCorrect,
                    GradingStatus = GradingStatus.NotApplicable
                });
            }
        }

        // Записва опита в базата данни (нов обект - immutable pattern)
        var attempt = new Attempt
        {
            Id = Guid.NewGuid(),
            ParticipantName = resolvedParticipantName,
            ParticipantEmail = normalizedEmail,
            Score = score,
            TotalQuestions = maxScore,   // Съхраняваме MaxScore в TotalQuestions за обратна съвместимост
            TestId = test.Id,
            CreatedAt = DateTime.UtcNow,
            AttemptAnswers = attemptAnswersList
        };

        _db.Attempts.Add(attempt);
        await _db.SaveChangesAsync();

        // Изчислява процента спрямо максималните точки
        double percent = maxScore > 0
            ? Math.Round((double)score / maxScore * 100, 2)
            : 0;

        // Изгражда резултата за отговора — по един запис на въпрос
        var questionResultsList = test.Questions
            .OrderBy(q => q.OrderIndex)
            .Select(q =>
            {
                var myAnswers = attemptAnswersList.Where(aa => aa.QuestionId == q.Id).ToList();
                var firstAnswer = myAnswers.FirstOrDefault();
                bool isOpenLike = q.Type == "Open" || q.Type == "Code";
                bool? qIsCorrect = isOpenLike
                    ? null   // чака AI оценяване
                    : (q.Type == "Multi"
                        ? myAnswers.Any(aa => aa.IsCorrect)
                        : firstAnswer?.IsCorrect ?? false);

                return new AttemptQuestionResult
                {
                    QuestionId = q.Id,
                    QuestionText = q.Text,
                    QuestionType = q.Type,
                    SelectedAnswerId = firstAnswer?.SelectedAnswerId,
                    IsCorrect = qIsCorrect
                };
            })
            .ToList();

        return new AttemptResultResponse
        {
            Score = score,
            MaxScore = maxScore,
            TotalQuestions = test.Questions.Count,
            Percent = percent,
            Results = questionResultsList
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

        // Валидира продължителността (мин 60 сек = 1 мин, макс 28800 сек = 480 мин)
        if (request.Duration < 60 || request.Duration > 28800)
            throw new InvalidOperationException("Продължителността трябва да е между 1 и 480 минути.");

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
                Points = q.Points > 0 ? q.Points : ComputeDefaultPoints(q.Type, q.Answers),
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

    // Архивира тест (Draft/Published → Archived). Архивираните не се достъпват от ученици.
    public async Task<bool> ArchiveTestAsync(Guid testId, Guid ownerId)
    {
        var test = await _db.Tests
            .FirstOrDefaultAsync(t => t.Id == testId && t.OwnerId == ownerId);

        if (test is null) return false;

        test.Status = TestStatus.Archived;
        await _db.SaveChangesAsync();
        return true;
    }

    // Възстановява архивиран тест към Draft (учителят пак го публикува ако иска)
    public async Task<bool> RestoreTestAsync(Guid testId, Guid ownerId)
    {
        var test = await _db.Tests
            .FirstOrDefaultAsync(t => t.Id == testId && t.OwnerId == ownerId);

        if (test is null) return false;

        test.Status = TestStatus.Draft;
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
                ParticipantEmail = a.ParticipantEmail,
                Score = a.Score,
                TotalQuestions = a.TotalQuestions,
                Percent = a.TotalQuestions > 0
                    ? Math.Round((double)a.Score / a.TotalQuestions * 100, 2)
                    : 0,
                CreatedAt = a.CreatedAt,
                IsVoided = a.IsVoided
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

        // Изгражда детайли за всеки въпрос с точки
        var questions = test.Questions.Select(q =>
        {
            bool isOpenLike = q.Type == "Open" || q.Type == "Code";
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

            // Изчислява спечелените точки за въпроса
            int pointsEarned = 0;
            if (isOpenLike)
            {
                // AI оценените точки са в AiScore (0..question.Points)
                pointsEarned = aiScore ?? 0;
            }
            else if (q.Type == "Multi")
            {
                // Частично точкуване: +1 верен, -1 грешен, min 0, cap Points
                int correctSelected = myAnswers.Count(aa => aa.SelectedAnswerId.HasValue && aa.IsCorrect);
                int wrongSelected = myAnswers.Count(aa => aa.SelectedAnswerId.HasValue && !aa.IsCorrect);
                pointsEarned = Math.Max(0, Math.Min(q.Points, correctSelected - wrongSelected));
            }
            else
            {
                // Closed: всичко или нищо
                pointsEarned = isCorrect == true ? q.Points : 0;
            }

            return new AttemptQuestionDetail
            {
                QuestionId = q.Id,
                QuestionText = q.Text,
                QuestionType = q.Type,
                Scorable = !isOpenLike,
                Points = q.Points,
                PointsEarned = pointsEarned,
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

        // Изчислява общия резултат базиран на точки
        var gradedOpenCount = questions.Count(q => !q.Scorable && q.GradingStatus == "Graded");
        var hasOpen = questions.Any(q => !q.Scorable);
        var allGraded = !hasOpen || questions.Where(q => !q.Scorable).All(q => q.GradingStatus == "Graded");

        // Сума на точките от всички въпроси (включително AI-оценените)
        int totalScore = questions.Sum(q => q.PointsEarned);
        // Максимален резултат = сума от точките на ВСИЧКИ въпроси
        // (Open/Code се броят дори ако още не са оценени от AI — ще добавят точки след това)
        int maxPossible = questions.Sum(q => q.Points);

        return new AttemptDetailResponse
        {
            AttemptId = attempt.Id,
            ParticipantName = attempt.ParticipantName,
            ParticipantGroup = null, // Attempt entity няма ParticipantGroup в текущия модел
            StartedAt = attempt.CreatedAt,
            FinishedAt = null,
            Score = totalScore,
            MaxScore = maxPossible,
            TotalQuestions = questions.Count,
            Percent = maxPossible > 0 ? Math.Round((double)totalScore / maxPossible * 100, 1) : 0,
            HasOpenAnswers = hasOpen,
            AllGraded = allGraded,
            Questions = questions,
        };
    }

    // Изчислява броя точки по подразбиране спрямо типа въпрос и отговорите
    // Closed: ceil(отговори / 2), Multi: брой отговори, Open: 3, Code: 4
    private static int ComputeDefaultPoints(string type, List<CreateAnswerDto> answers)
    {
        return type switch
        {
            "Open" => 3,
            "Code" => 4,
            "Multi" => Math.Max(1, answers.Count),
            _ => Math.Max(1, (int)Math.Ceiling(answers.Count / 2.0)) // Closed
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

        // Включва и Failed — за да може да се ретрайне след грешка от AI
        var pendingAnswers = attempt.AttemptAnswers
            .Where(aa => aa.GradingStatus == GradingStatus.Pending
                      || aa.GradingStatus == GradingStatus.Failed)
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

        // Оценява всеки Pending отговор с AI (предава maxPoints = question.Points)
        foreach (var aa in pendingAnswers)
        {
            var question = test.Questions.FirstOrDefault(q => q.Id == aa.QuestionId);
            if (question is null) continue;

            try
            {
                var (aiScore, feedback) = await _aiGrading.GradeAnswerAsync(
                    question.Text, question.SampleAnswer, aa.OpenText ?? "", question.Type, question.Points);
                aa.GradingStatus = GradingStatus.Graded;
                aa.AiScore = aiScore;
                aa.AiFeedback = feedback;
                aa.IsCorrect = aiScore > 0;
                aa.GradedAt = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "AI grading failed for question {QuestionId}: {Message}", aa.QuestionId, ex.Message);
                aa.GradingStatus = GradingStatus.Failed;
                aa.AiFeedback = $"Грешка при автоматична проверка: {ex.Message}";
            }
        }

        // Преизчислява резултата базиран на точки
        var allAnswers = attempt.AttemptAnswers.ToList();

        // Оценяеми въпроси (Closed/Multi) — по точки
        int scorablePoints = 0;
        foreach (var q in test.Questions.Where(q => q.Type != "Open" && q.Type != "Code"))
        {
            if (q.Type == "Multi")
            {
                var qAnswers = allAnswers.Where(aa => aa.QuestionId == q.Id && aa.SelectedAnswerId.HasValue).ToList();
                int correctSel = qAnswers.Count(aa => aa.IsCorrect);
                int wrongSel = qAnswers.Count(aa => !aa.IsCorrect);
                scorablePoints += Math.Max(0, Math.Min(q.Points, correctSel - wrongSel));
            }
            else
            {
                // Closed
                bool correct = allAnswers.Any(aa => aa.QuestionId == q.Id && aa.IsCorrect);
                scorablePoints += correct ? q.Points : 0;
            }
        }

        // AI оценени Open/Code въпроси — взимаме AiScore директно (вече е в диапазона [0, question.Points])
        int aiPoints = allAnswers
            .Where(aa =>
            {
                var q = test.Questions.FirstOrDefault(q => q.Id == aa.QuestionId);
                return q != null
                    && (q.Type == "Open" || q.Type == "Code")
                    && aa.GradingStatus == GradingStatus.Graded;
            })
            .Sum(aa => aa.AiScore ?? 0);

        attempt.Score = scorablePoints + aiPoints;

        await _db.SaveChangesAsync();
        return true;
    }

    // Анулира опит — учителят маркира IsVoided=true, позволявайки повторно решаване
    // Опитът НЕ се изтрива — запазва се за audit trail
    public async Task<bool> VoidAttemptAsync(Guid testId, Guid attemptId, Guid ownerId)
    {
        // Проверява дали тестът принадлежи на ownerId
        var testExists = await _db.Tests.AnyAsync(t => t.Id == testId && t.OwnerId == ownerId);
        if (!testExists) return false;

        var attempt = await _db.Attempts
            .FirstOrDefaultAsync(a => a.Id == attemptId && a.TestId == testId);

        if (attempt is null) return false;

        attempt.IsVoided = true;
        await _db.SaveChangesAsync();
        return true;
    }
}
