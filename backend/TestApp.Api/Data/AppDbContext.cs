// Стъпка 24 — AppDbContext.cs
// Контекст на базата данни за приложението
using Microsoft.EntityFrameworkCore;
using TestApp.Api.Models;

namespace TestApp.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // Таблица с потребители
    public DbSet<AppUser> Users => Set<AppUser>();

    // Таблица с тестове
    public DbSet<Test> Tests => Set<Test>();

    // Таблица с въпроси
    public DbSet<Question> Questions => Set<Question>();

    // Таблица с отговори
    public DbSet<Answer> Answers => Set<Answer>();

    // Таблица с категории
    public DbSet<Category> Categories => Set<Category>();

    // Свързваща таблица тест-категория
    public DbSet<TestCategory> TestCategories => Set<TestCategory>();

    // Таблица с опити
    public DbSet<Attempt> Attempts => Set<Attempt>();

    // Таблица с отговори на опити
    public DbSet<AttemptAnswer> AttemptAnswers => Set<AttemptAnswer>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Уникален индекс по имейл
        builder.Entity<AppUser>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // Уникален индекс по код за споделяне
        builder.Entity<Test>()
            .HasIndex(t => t.ShareCode)
            .IsUnique();

        // Статусът се съхранява като string
        builder.Entity<Test>()
            .Property(t => t.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        // Конфигурация на много-към-много за TestCategory
        builder.Entity<TestCategory>()
            .HasKey(tc => new { tc.TestId, tc.CategoryId });

        builder.Entity<TestCategory>()
            .HasOne(tc => tc.Test)
            .WithMany(t => t.TestCategories)
            .HasForeignKey(tc => tc.TestId);

        builder.Entity<TestCategory>()
            .HasOne(tc => tc.Category)
            .WithMany(c => c.TestCategories)
            .HasForeignKey(tc => tc.CategoryId);

        // Въпросите се изтриват при изтриване на теста
        builder.Entity<Test>()
            .HasMany(t => t.Questions)
            .WithOne(q => q.Test)
            .HasForeignKey(q => q.TestId)
            .OnDelete(DeleteBehavior.Cascade);

        // Отговорите се изтриват при изтриване на въпроса
        builder.Entity<Question>()
            .HasMany(q => q.Answers)
            .WithOne(a => a.Question)
            .HasForeignKey(a => a.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        // Примерният отговор е ограничен до 50000 символа (за Code тип)
        builder.Entity<Question>()
            .Property(q => q.SampleAnswer)
            .HasMaxLength(50000);

        // GradingStatus се съхранява като int в базата данни
        builder.Entity<AttemptAnswer>()
            .Property(aa => aa.GradingStatus)
            .HasConversion<int>();

        // Filtered unique index — единствен non-voided опит per (TestId, ParticipantEmail)
        // SQLite: "IsVoided" = 0 AND "ParticipantEmail" IS NOT NULL
        builder.Entity<Attempt>()
            .HasIndex(a => new { a.TestId, a.ParticipantEmail })
            .HasFilter("\"IsVoided\" = 0 AND \"ParticipantEmail\" IS NOT NULL")
            .IsUnique();
    }
}
