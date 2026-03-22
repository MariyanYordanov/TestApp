// Стъпка 26 — SubmitAttemptRequest.cs
// DTO: заявка за предаване на опит за тест
using System.ComponentModel.DataAnnotations;

namespace TestApp.Api.Dtos.Tests;

public class SubmitAttemptRequest
{
    // Име на участника
    [Required(ErrorMessage = "Името на участника е задължително.")]
    [MaxLength(200, ErrorMessage = "Името не може да е по-дълго от 200 символа.")]
    public string ParticipantName { get; set; } = string.Empty;

    // Избрани отговори
    public List<AttemptAnswerDto> Answers { get; set; } = new();
}

// DTO за избран отговор на въпрос
public class AttemptAnswerDto
{
    // Идентификатор на въпроса
    public Guid QuestionId { get; set; }

    // Идентификатор на избрания отговор (null ако не е избран)
    public Guid? SelectedAnswerId { get; set; }
}
