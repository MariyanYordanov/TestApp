// Стъпка 26 — AuthResponse.cs
// DTO: отговор при успешна автентикация
namespace TestApp.Api.Dtos.Auth;

public class AuthResponse
{
    // JWT токен за автентикация
    public string Token { get; set; } = string.Empty;

    // Информация за потребителя
    public UserDto User { get; set; } = new();
}
