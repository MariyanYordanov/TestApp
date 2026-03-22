// Стъпка 35 — WebAppFactory.cs
// WebApplicationFactory за интеграционни тестове
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Api.Data;

namespace TestApp.Tests.Helpers;

public class WebAppFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection;

    public WebAppFactory()
    {
        // Отваря постоянна in-memory SQLite връзка за всички тестове
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Премахва реалния DbContext
            var dbDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));

            if (dbDescriptor is not null)
            {
                services.Remove(dbDescriptor);
            }

            // Добавя in-memory SQLite DbContext
            services.AddDbContext<AppDbContext>(options =>
                options.UseSqlite(_connection));
        });

        // Заменя JWT конфигурацията с тестовата
        builder.UseSetting("Jwt:SecretKey", JwtTestHelper.TestSecretKey);
        builder.UseSetting("Jwt:Issuer", JwtTestHelper.TestIssuer);
        builder.UseSetting("Jwt:Audience", JwtTestHelper.TestAudience);
        builder.UseSetting("Jwt:ExpirationInHours", "1");

        builder.UseEnvironment("Testing");
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _connection.Dispose();
        }
    }
}
