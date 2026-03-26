namespace TestApp.Api.Dtos.Tests;

public class AttemptDetailResponse
{
    public Guid AttemptId { get; set; }
    public string ParticipantName { get; set; } = "";
    public string? ParticipantGroup { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    public int Score { get; set; }
    public int TotalQuestions { get; set; }
    public double Percent { get; set; }
    public bool HasOpenAnswers { get; set; }    // має ли Open/Code въпроси
    public bool AllGraded { get; set; }          // всички Open/Code оценени ли са
    public List<AttemptQuestionDetail> Questions { get; set; } = [];
}

public class AttemptQuestionDetail
{
    public Guid QuestionId { get; set; }
    public string QuestionText { get; set; } = "";
    public string QuestionType { get; set; } = "";  // Closed / Multi / Open / Code
    public bool Scorable { get; set; }
    public string? SampleAnswer { get; set; }       // за Open/Code
    public List<AttemptAnswerDetail> Answers { get; set; } = [];  // за Closed/Multi
    public string? OpenText { get; set; }           // за Open/Code
    public bool? IsCorrect { get; set; }
    public string GradingStatus { get; set; } = "NotApplicable";
    public string? AiFeedback { get; set; }
    public int? AiScore { get; set; }
}

public class AttemptAnswerDetail
{
    public Guid AnswerId { get; set; }
    public string Text { get; set; } = "";
    public bool IsCorrect { get; set; }             // правилен ли е вариантът
    public bool WasSelected { get; set; }           // избрал ли го е ученикът
}
