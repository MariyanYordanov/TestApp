// IStudentDirectoryService.cs
// Интерфейс за достъп до директорията с ученици (students.json)
namespace TestApp.Api.Services;

// Резултат от намирането на ученик по имейл
public record StudentLookupResult(string FullName, string ClassName);

public interface IStudentDirectoryService
{
    // Дали файлът students.json е наличен и зареден успешно
    bool IsAvailable { get; }

    // Връща всички класове (ключове на JSON обекта)
    IReadOnlyList<string> GetClasses();

    // Търси ученик по имейл (case-insensitive, trimmed)
    // Връща null ако не е намерен или директорията не е достъпна
    StudentLookupResult? FindByEmail(string email);
}
