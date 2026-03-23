// Стъпка 30 — ITestService.cs
// Интерфейс за услугата за управление на тестове
using TestApp.Api.Dtos.Tests;

namespace TestApp.Api.Services;

public interface ITestService
{
    // Връща всички тестове на конкретен собственик
    Task<List<TestListItem>> GetTestsByOwnerAsync(Guid ownerId);

    // Създава нов тест
    Task<TestListItem> CreateTestAsync(CreateTestRequest request, Guid ownerId);

    // Връща публичен изглед на тест по код за споделяне (само Published)
    Task<PublicTestResponse?> GetPublicTestAsync(string shareCode);

    // Връща пълен изглед на тест за учителя (проверява собствеността)
    Task<FullTestResponse?> GetFullTestAsync(Guid testId, Guid ownerId);

    // Предава опит за тест и изчислява резултата
    Task<AttemptResultResponse?> SubmitAttemptAsync(string shareCode, SubmitAttemptRequest request);

    // Публикува тест (Draft → Published). Връща false ако не е намерен или не е на ownerId.
    Task<bool> PublishTestAsync(Guid testId, Guid ownerId);

    // Връща обобщените резултати на опитите за даден тест (само за собственика)
    Task<List<AttemptSummary>> GetAttemptsByTestAsync(Guid testId, Guid ownerId);
}
