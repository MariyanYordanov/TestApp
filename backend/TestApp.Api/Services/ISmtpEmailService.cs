// ISmtpEmailService.cs
// Интерфейс за изпращане на email чрез SMTP (например Gmail).
// Конфигурацията е в Smtp:* секцията на appsettings.
namespace TestApp.Api.Services;

public interface ISmtpEmailService
{
    // Дали SMTP е конфигуриран и готов за изпращане
    bool IsConfigured { get; }

    // Изпраща plain-text email. Хвърля изключение при грешка.
    Task SendAsync(string toEmail, string subject, string plainBody, CancellationToken ct = default);
}
