// ResultEmailComposer.cs
// Генерира plain-text body за email с резултат от тест.
// Compact format (вариант B): обобщение + по 1 ред на въпрос.
using System.Text;
using TestApp.Api.Dtos.Tests;

namespace TestApp.Api.Services;

public static class ResultEmailComposer
{
    public record EmailContent(string Subject, string Body);

    public static EmailContent Compose(string testTitle, AttemptDetailResponse detail, string fromName)
    {
        var subject = $"Резултат от тест: {testTitle}";
        var sb = new StringBuilder();

        sb.AppendLine($"Здравей {detail.ParticipantName},");
        sb.AppendLine();
        sb.AppendLine($"Резултат от \"{testTitle}\": {detail.Score} / {detail.MaxScore} т. ({detail.Percent:F1}%)");

        if (detail.HasOpenAnswers && !detail.AllGraded)
        {
            sb.AppendLine();
            sb.AppendLine("Бележка: някои отговори все още чакат проверка от ИИ.");
        }

        if (detail.Questions != null && detail.Questions.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Преглед по въпроси:");

            for (int i = 0; i < detail.Questions.Count; i++)
            {
                var q = detail.Questions[i];
                var num = i + 1;
                var symbol = GetVerdictSymbol(q);
                var line = $"{symbol} Въпрос {num} — {q.PointsEarned}/{q.Points} т.";

                // За Open/Code въпроси добавяме кратък AI feedback (макс 80 символа)
                if (!q.Scorable && !string.IsNullOrWhiteSpace(q.AiFeedback))
                {
                    var fb = q.AiFeedback.Trim();
                    if (fb.Length > 80) fb = fb.Substring(0, 77) + "...";
                    line += $" — \"{fb}\"";
                }

                sb.AppendLine(line);
            }
        }

        sb.AppendLine();
        sb.AppendLine("За въпроси и пояснения — свържи се с учителя.");
        sb.AppendLine();
        sb.AppendLine($"Поздрави,");
        sb.AppendLine(fromName);

        return new EmailContent(subject, sb.ToString());
    }

    private static string GetVerdictSymbol(AttemptQuestionDetail q)
    {
        if (!q.Scorable)
        {
            // Open/Code
            if (q.GradingStatus == "Pending") return "⏳";
            if (q.GradingStatus == "Failed")  return "?";
            // Graded — оценяваме като пълно/частично/грешно
            if (q.AiScore.HasValue && q.Points > 0)
            {
                var ratio = (double)q.AiScore.Value / q.Points;
                if (ratio >= 1.0) return "✓";
                if (ratio > 0)    return "~";
                return "✗";
            }
            return "?";
        }
        return q.IsCorrect == true ? "✓" : "✗";
    }
}
