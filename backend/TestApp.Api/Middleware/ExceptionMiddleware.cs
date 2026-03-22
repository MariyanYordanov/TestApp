// Стъпка 32 — ExceptionMiddleware.cs
// Middleware за централизирано обработване на грешки
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace TestApp.Api.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (InvalidOperationException ex)
        {
            // Клиентска грешка (напр. дублиран имейл) → 400 Bad Request
            _logger.LogWarning(ex, "Невалидна операция: {Message}", ex.Message);
            await WriteErrorResponse(context, StatusCodes.Status400BadRequest, ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            // Неоторизиран достъп (напр. грешна парола) → 401 Unauthorized
            _logger.LogWarning(ex, "Неоторизиран достъп: {Message}", ex.Message);
            await WriteErrorResponse(context, StatusCodes.Status401Unauthorized, ex.Message);
        }
        catch (DbUpdateException ex)
        {
            // Нарушена уникалност или FK constraint → 409 Conflict
            _logger.LogWarning(ex, "Грешка при запис в базата данни: {Message}", ex.Message);
            await WriteErrorResponse(
                context,
                StatusCodes.Status409Conflict,
                "Конфликт при запис — вероятно дублирани данни.");
        }
        catch (Exception ex)
        {
            // Всяка друга грешка → 500 Internal Server Error
            _logger.LogError(ex, "Неочаквана грешка: {Message}", ex.Message);
            await WriteErrorResponse(
                context,
                StatusCodes.Status500InternalServerError,
                "Вътрешна грешка на сървъра.");
        }
    }

    // Записва JSON отговор с грешка
    private static async Task WriteErrorResponse(
        HttpContext context, int statusCode, string message)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var response = new { error = message };
        string json = JsonSerializer.Serialize(response);

        await context.Response.WriteAsync(json);
    }
}
