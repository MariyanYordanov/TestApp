// Стъпка 26 — UserDto.cs
// DTO: публична информация за потребител
namespace TestApp.Api.Dtos.Auth;

public class UserDto
{
    // Идентификатор на потребителя
    public Guid Id { get; set; }

    // Имейл адрес
    public string Email { get; set; } = string.Empty;

    // Пълно ime
    public string FullName { get; set; } = string.Empty;
}
