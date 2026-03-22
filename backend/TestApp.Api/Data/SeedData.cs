// Стъпка 31 — SeedData.cs
// Начални данни за базата данни (idempotent)
using Microsoft.EntityFrameworkCore;
using TestApp.Api.Models;

namespace TestApp.Api.Data;

public static class SeedData
{
    // Зарежда началните данни ако не съществуват
    public static async Task SeedAsync(AppDbContext db)
    {
        // Проверява дали вече има потребители И категории (idempotent)
        // Двойна проверка предотвратява частичен seed при прекъсване
        if (await db.Users.AnyAsync() && await db.Categories.AnyAsync())
        {
            return;
        }

        // Създава категориите
        var categoryJavaScript = new Category
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111101"),
            Name = "JavaScript"
        };
        var categoryCSharp = new Category
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111102"),
            Name = "C#"
        };
        var categoryMath = new Category
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111103"),
            Name = "Математика"
        };
        var categoryHistory = new Category
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111104"),
            Name = "История"
        };
        var categoryBiology = new Category
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111105"),
            Name = "Биология"
        };

        db.Categories.AddRange(
            categoryJavaScript, categoryCSharp,
            categoryMath, categoryHistory, categoryBiology
        );

        // Създава тестовия потребител (учител)
        var teacher = new AppUser
        {
            Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            Email = "teacher@test.com",
            // BCrypt хеш на "Password1!"
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password1!"),
            FullName = "Тест Учител",
            CreatedAt = DateTime.UtcNow
        };

        db.Users.Add(teacher);

        // Създава въпросите за JavaScript теста
        var q1 = new Question
        {
            Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01"),
            Text = "Какво е JavaScript?",
            OrderIndex = 0,
            Answers = new List<Answer>
            {
                new() { Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccc01"),
                        Text = "Програмен език", IsCorrect = true, OrderIndex = 0 },
                new() { Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccc02"),
                        Text = "База данни", IsCorrect = false, OrderIndex = 1 },
                new() { Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccc03"),
                        Text = "Операционна система", IsCorrect = false, OrderIndex = 2 }
            }
        };

        var q2 = new Question
        {
            Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02"),
            Text = "Кой е правилният начин за деклариране на константа?",
            OrderIndex = 1,
            Answers = new List<Answer>
            {
                new() { Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccc04"),
                        Text = "var x = 5", IsCorrect = false, OrderIndex = 0 },
                new() { Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccc05"),
                        Text = "let x = 5", IsCorrect = false, OrderIndex = 1 },
                new() { Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccc06"),
                        Text = "const x = 5", IsCorrect = true, OrderIndex = 2 },
                new() { Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccc07"),
                        Text = "int x = 5", IsCorrect = false, OrderIndex = 3 }
            }
        };

        var q3 = new Question
        {
            Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03"),
            Text = "Какво връща typeof null?",
            OrderIndex = 2,
            Answers = new List<Answer>
            {
                new() { Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccc08"),
                        Text = "\"undefined\"", IsCorrect = false, OrderIndex = 0 },
                new() { Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccc09"),
                        Text = "\"null\"", IsCorrect = false, OrderIndex = 1 },
                new() { Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccc10"),
                        Text = "\"object\"", IsCorrect = true, OrderIndex = 2 }
            }
        };

        // Създава JavaScript теста
        var jsTest = new Test
        {
            Id = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd"),
            Title = "Тест по JavaScript",
            Description = "Основни концепции в JavaScript",
            Duration = 1800,
            Status = TestStatus.Published,
            ShareCode = "ABCD1234",
            OwnerId = teacher.Id,
            CreatedAt = DateTime.UtcNow,
            Questions = new List<Question> { q1, q2, q3 }
        };

        // Добавя категорията JavaScript към теста
        jsTest.TestCategories.Add(new TestCategory
        {
            TestId = jsTest.Id,
            CategoryId = categoryJavaScript.Id
        });

        db.Tests.Add(jsTest);
        await db.SaveChangesAsync();
    }
}
