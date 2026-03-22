// Стъпка 29 — IAuthService.cs
// Интерфейс за услугата за автентикация
using TestApp.Api.Dtos.Auth;

namespace TestApp.Api.Services;

public interface IAuthService
{
    // Регистрира нов потребител
    Task<AuthResponse> RegisterAsync(RegisterRequest request);

    // Влизане в системата
    Task<AuthResponse> LoginAsync(LoginRequest request);
}
