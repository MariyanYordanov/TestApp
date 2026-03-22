// Стъпка 26 — TestListItem.cs
// DTO: елемент от списъка с тестове
namespace TestApp.Api.Dtos.Tests;

public class TestListItem
{
    // Идентификатор на теста
    public Guid Id { get; set; }

    // Заглавие на теста
    public string Title { get; set; } = string.Empty;

    // Статус на теста
    public string Status { get; set; } = string.Empty;

    // Брой въпроси
    public int QuestionsCount { get; set; }

    // Брой опити
    public int AttemptsCount { get; set; }

    // Дата на създаване
    public DateTime CreatedAt { get; set; }

    // Код за споделяне
    public string ShareCode { get; set; } = string.Empty;
}
