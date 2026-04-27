// Стъпка 36 — AttemptSummary.cs
// DTO: обобщен резултат от опит за статистика
namespace TestApp.Api.Dtos.Tests;

public class AttemptSummary
{
    public Guid Id { get; set; }
    public string ParticipantName { get; set; } = string.Empty;
    public string? ParticipantEmail { get; set; }
    public int Score { get; set; }
    public int TotalQuestions { get; set; }
    public double Percent { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsVoided { get; set; }
}
