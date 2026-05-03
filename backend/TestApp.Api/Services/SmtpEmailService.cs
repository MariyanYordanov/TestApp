// SmtpEmailService.cs
// Изпраща email през SMTP (например Gmail) с MailKit.
// Конфигурация в appsettings (Smtp:Host, Smtp:Port, Smtp:Username, Smtp:Password,
// Smtp:FromEmail, Smtp:FromName).
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace TestApp.Api.Services;

public class SmtpEmailService : ISmtpEmailService
{
    private readonly string? _host;
    private readonly int _port;
    private readonly string? _username;
    private readonly string? _password;
    private readonly string? _fromEmail;
    private readonly string _fromName;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IConfiguration config, ILogger<SmtpEmailService> logger)
    {
        _host = config["Smtp:Host"];
        _port = int.TryParse(config["Smtp:Port"], out var p) ? p : 587;
        _username = config["Smtp:Username"];
        _password = config["Smtp:Password"];
        _fromEmail = config["Smtp:FromEmail"] ?? _username;
        _fromName = config["Smtp:FromName"] ?? "TestApp";
        _logger = logger;
    }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_host) &&
        !string.IsNullOrWhiteSpace(_username) &&
        !string.IsNullOrWhiteSpace(_password) &&
        !string.IsNullOrWhiteSpace(_fromEmail);

    public async Task SendAsync(string toEmail, string subject, string plainBody, CancellationToken ct = default)
    {
        if (!IsConfigured)
            throw new InvalidOperationException(
                "SMTP не е конфигуриран. Задайте Smtp:Host, Smtp:Username, Smtp:Password, Smtp:FromEmail.");

        if (string.IsNullOrWhiteSpace(toEmail))
            throw new ArgumentException("toEmail е задължителен", nameof(toEmail));

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_fromName, _fromEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject ?? "";
        message.Body = new TextPart("plain") { Text = plainBody ?? "" };

        using var client = new SmtpClient();
        try
        {
            // STARTTLS на 587, SSL/TLS на 465
            var secureOption = _port == 465
                ? SecureSocketOptions.SslOnConnect
                : SecureSocketOptions.StartTls;

            await client.ConnectAsync(_host, _port, secureOption, ct);
            await client.AuthenticateAsync(_username, _password, ct);
            await client.SendAsync(message, ct);
            await client.DisconnectAsync(true, ct);

            _logger.LogInformation("Email изпратен до {To} (subject: {Subject})", toEmail, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SMTP изпращане към {To} се провали", toEmail);
            throw;
        }
    }
}
