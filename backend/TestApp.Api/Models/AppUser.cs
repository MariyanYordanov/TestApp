// Стъпка 23 — AppUser.cs
// Entity: потребител на платформата (учител)
namespace TestApp.Api.Models;

public class AppUser
{
    // Уникален идентификатор на потребителя
    public Guid Id { get; set; } = Guid.NewGuid();

    // Имейл адрес (уникален)
    public string Email { get; set; } = string.Empty;

    // BCrypt хеш на паролата
    public string PasswordHash { get; set; } = string.Empty;

    // Пълно име на потребителя
    public string FullName { get; set; } = string.Empty;

    // Дата на регистрация
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Тестове, създадени от потребителя
    public List<Test> Tests { get; set; } = new();
}
