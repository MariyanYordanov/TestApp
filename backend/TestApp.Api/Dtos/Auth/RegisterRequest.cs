// Стъпка 26 — RegisterRequest.cs
// DTO: заявка за регистрация на нов потребител
using System.ComponentModel.DataAnnotations;

namespace TestApp.Api.Dtos.Auth;

public class RegisterRequest
{
    // Имейл адрес на потребителя (задължителен)
    [Required(ErrorMessage = "Имейлът е задължителен.")]
    [EmailAddress(ErrorMessage = "Невалиден имейл адрес.")]
    public string Email { get; set; } = string.Empty;

    // Парола (минимум 8 символа)
    [Required(ErrorMessage = "Паролата е задължителна.")]
    [MinLength(8, ErrorMessage = "Паролата трябва да е поне 8 символа.")]
    public string Password { get; set; } = string.Empty;

    // Пълно ime на потребителя
    [Required(ErrorMessage = "Пълното име е задължително.")]
    [MinLength(2, ErrorMessage = "Пълното ime трябва да е поне 2 символа.")]
    [MaxLength(100, ErrorMessage = "Пълното ime не може да надвишава 100 символа.")]
    public string FullName { get; set; } = string.Empty;
}
