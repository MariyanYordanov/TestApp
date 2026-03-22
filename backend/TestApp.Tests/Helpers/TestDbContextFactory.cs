// Стъпка 35 — TestDbContextFactory.cs
// Фабрика за създаване на in-memory SQLite DbContext за тестове
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using TestApp.Api.Data;

namespace TestApp.Tests.Helpers;

public class TestDbContextFactory : IDisposable
{
    private readonly SqliteConnection _connection;

    public TestDbContextFactory()
    {
        // Отваря постоянна in-memory SQLite връзка
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
    }

    // Създава нов DbContext с уникална in-memory база данни
    public AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        var context = new AppDbContext(options);
        // Създава схемата на базата данни
        context.Database.EnsureCreated();

        return context;
    }

    // Освобождава ресурсите
    public void Dispose()
    {
        _connection.Dispose();
    }
}
