// Стъпка 32 — ServiceCollectionExtensions.cs
// Extension методи за регистрация на услуги
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using TestApp.Api.Data;
using TestApp.Api.Services;

namespace TestApp.Api.Extensions;

public static class ServiceCollectionExtensions
{
    // Добавя JWT автентикация
    public static IServiceCollection AddJwtAuthentication(
        this IServiceCollection services,
        IConfiguration config)
    {
        string secretKey = config["Jwt:SecretKey"]
            ?? throw new InvalidOperationException("Jwt:SecretKey не е конфигуриран.");

        // Предотвратява стартиране в Production с placeholder secret
        if (secretKey == "REPLACE_WITH_ENV_VAR_IN_PRODUCTION")
            throw new InvalidOperationException(
                "Jwt:SecretKey трябва да се замени с реален secret в Production. " +
                "Използвайте environment variable или ASP.NET User Secrets.");

        string issuer = config["Jwt:Issuer"] ?? "TestApp";
        string audience = config["Jwt:Audience"] ?? "TestApp";

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = issuer,
                    ValidateAudience = true,
                    ValidAudience = audience,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(secretKey))
                };
            });

        return services;
    }

    // Добавя услугите на приложението (DbContext, Services, CORS)
    public static IServiceCollection AddAppServices(
        this IServiceCollection services,
        IConfiguration config)
    {
        // Регистрира DbContext с SQLite
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlite(config.GetConnectionString("DefaultConnection")));

        // Регистрира услугите
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ITestService, TestService>();
        services.AddScoped<IShareCodeGenerator, ShareCodeGenerator>();
        services.AddScoped<ICategoryService, CategoryService>();

        // Регистрира AI оценяващата услуга (само ако е конфигурирано API Key)
        var anthropicKey = config["Anthropic:ApiKey"];
        if (!string.IsNullOrEmpty(anthropicKey))
        {
            services.AddHttpClient<IAiGradingService, AiGradingService>();
        }

        // Конфигурира CORS политика
        services.AddCors(options =>
        {
            options.AddPolicy("FrontendPolicy", policy =>
            {
                policy
                    .WithOrigins(
                        "http://localhost:3000",
                        "http://localhost:5500",
                        "http://127.0.0.1:5500",
                        "http://127.0.0.1:3000")
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            });
        });

        return services;
    }

    // Добавя rate limiting за защита от brute-force атаки (пропуска се в Testing)
    public static IServiceCollection AddAppRateLimiting(
        this IServiceCollection services,
        IWebHostEnvironment env)
    {
        if (env.IsEnvironment("Testing"))
            return services;

        services.AddRateLimiter(options =>
        {
            // Строга политика за auth endpoints — 5 заявки за 1 минута на IP
            options.AddSlidingWindowLimiter("AuthPolicy", limiterOptions =>
            {
                limiterOptions.Window = TimeSpan.FromMinutes(1);
                limiterOptions.SegmentsPerWindow = 6;
                limiterOptions.PermitLimit = 5;
                limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                limiterOptions.QueueLimit = 0;
            });

            // По-мека политика за публични endpoints — 30 заявки за 1 минута на IP
            options.AddSlidingWindowLimiter("PublicPolicy", limiterOptions =>
            {
                limiterOptions.Window = TimeSpan.FromMinutes(1);
                limiterOptions.SegmentsPerWindow = 6;
                limiterOptions.PermitLimit = 30;
                limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                limiterOptions.QueueLimit = 0;
            });

            // Отговор при превишен лимит — 429 Too Many Requests
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        });

        return services;
    }
}
