// Стъпка 26 — LoginRequest.cs
// DTO: заявка за влизане в системата
using System.ComponentModel.DataAnnotations;

namespace TestApp.Api.Dtos.Auth;

public class LoginRequest
{
    // Имейл адрес
    [Required(ErrorMessage = "Имейлът е задължителен.")]
    [EmailAddress(ErrorMessage = "Невалиден имейл адрес.")]
    public string Email { get; set; } = string.Empty;

    // Парола
    [Required(ErrorMessage = "Паролата е задължителна.")]
    public string Password { get; set; } = string.Empty;
}
