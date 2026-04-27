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

    // Имейл на участника (само при email gate тестове)
    [MaxLength(254, ErrorMessage = "Имейлът не може да е по-дълъг от 254 символа.")]
    public string? ParticipantEmail { get; set; }

    // Избрани отговори
    public List<AttemptAnswerDto> Answers { get; set; } = new();
}

// DTO за избран отговор на въпрос
public class AttemptAnswerDto
{
    // Идентификатор на въпроса
    public Guid QuestionId { get; set; }

    // Идентификатор на избрания отговор (null за Open/Code въпроси)
    public Guid? SelectedAnswerId { get; set; }

    // Свободен текстов отговор (само за Open и Code въпроси)
    [MaxLength(50000, ErrorMessage = "Отговорът не може да надвишава 50 000 символа.")]
    public string? OpenText { get; set; }
}
