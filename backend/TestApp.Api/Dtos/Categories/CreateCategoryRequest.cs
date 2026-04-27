// Стъпка 37 — CreateCategoryRequest.cs
// DTO: заявка за създаване на категория
using System.ComponentModel.DataAnnotations;

namespace TestApp.Api.Dtos.Categories;

public class CreateCategoryRequest
{
    [Required(ErrorMessage = "Името на категорията е задължително.")]
    [MinLength(3, ErrorMessage = "Името на категорията трябва да е по-дълго от 3 символа.")]
    [MaxLength(100, ErrorMessage = "Името не може да е по-дълго от 100 символа.")]
    public string Name { get; set; } = string.Empty;
}
