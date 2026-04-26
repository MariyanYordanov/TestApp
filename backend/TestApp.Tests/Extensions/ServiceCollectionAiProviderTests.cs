// ServiceCollectionAiProviderTests.cs
// Тестове за DI конфигурация на AI grading provider-а

using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Api.Extensions;
using TestApp.Api.Services;

namespace TestApp.Tests.Extensions;

public class ServiceCollectionAiProviderTests
{
    // -------------------------------------------------------------------
    // Helper: построява минимална конфигурация и извиква AddAppServices
    // -------------------------------------------------------------------

    private static IServiceProvider BuildProvider(Dictionary<string, string?> settings)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                // Задължителни ключове, за да не се счупи AddAppServices
                ["ConnectionStrings:DefaultConnection"] = "DataSource=:memory:",
                ["Jwt:SecretKey"] = "test-secret-key-that-is-at-least-32-chars-long!",
                ["Jwt:Issuer"] = "TestApp",
                ["Jwt:Audience"] = "TestApp"
            })
            .AddInMemoryCollection(settings)
            .Build();

        var services = new ServiceCollection();

        // Регистрира IConfiguration за typed HttpClient factory constructor injection
        services.AddSingleton<IConfiguration>(config);

        // Добавя минималните зависимости изисквани от AddAppServices
        services.AddLogging();
        services.AddHttpClient();

        services.AddAppServices(config);

        return services.BuildServiceProvider();
    }

    // -------------------------------------------------------------------
    // Test 6: AddAppServices_WithProviderGroq_ResolvesGroqService
    // При AiGrading:Provider=Groq и наличен Groq:ApiKey → GroqGradingService
    // -------------------------------------------------------------------

    [Fact]
    public void AddAppServices_WithProviderGroq_ResolvesGroqService()
    {
        // Arrange
        var provider = BuildProvider(new Dictionary<string, string?>
        {
            ["AiGrading:Provider"] = "Groq",
            ["Groq:ApiKey"] = "gsk_test_key",
            ["Groq:Model"] = "llama-3.1-8b-instant"
        });

        // Act
        var service = provider.GetService<IAiGradingService>();

        // Assert
        service.Should().NotBeNull();
        service.Should().BeOfType<GroqGradingService>();
    }

    // -------------------------------------------------------------------
    // Test 7: AddAppServices_WithProviderAnthropic_ResolvesAnthropicService
    // При AiGrading:Provider=Anthropic и наличен Anthropic:ApiKey → AnthropicGradingService
    // -------------------------------------------------------------------

    [Fact]
    public void AddAppServices_WithProviderAnthropic_ResolvesAnthropicService()
    {
        // Arrange
        var provider = BuildProvider(new Dictionary<string, string?>
        {
            ["AiGrading:Provider"] = "Anthropic",
            ["Anthropic:ApiKey"] = "sk-ant-test-key"
        });

        // Act
        var service = provider.GetService<IAiGradingService>();

        // Assert
        service.Should().NotBeNull();
        service.Should().BeOfType<AnthropicGradingService>();
    }

    // -------------------------------------------------------------------
    // Test 8: AddAppServices_DefaultProvider_IsGroq
    // Без AiGrading:Provider ключ и с наличен Groq:ApiKey → GroqGradingService
    // -------------------------------------------------------------------

    [Fact]
    public void AddAppServices_DefaultProvider_IsGroq()
    {
        // Arrange — без AiGrading:Provider, само Groq:ApiKey
        var provider = BuildProvider(new Dictionary<string, string?>
        {
            ["Groq:ApiKey"] = "gsk_default_test_key",
            ["Groq:Model"] = "llama-3.1-8b-instant"
        });

        // Act
        var service = provider.GetService<IAiGradingService>();

        // Assert
        service.Should().NotBeNull();
        service.Should().BeOfType<GroqGradingService>();
    }
}
