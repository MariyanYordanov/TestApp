// Стъпка 28 — IShareCodeGenerator.cs
// Интерфейс за генериране на уникален код за споделяне
namespace TestApp.Api.Services;

public interface IShareCodeGenerator
{
    // Генерира уникален код за споделяне
    Task<string> GenerateAsync();
}
