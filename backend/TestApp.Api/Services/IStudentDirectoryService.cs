// IStudentDirectoryService.cs
// Интерфейс за достъп до директорията с ученици (students.json)
namespace TestApp.Api.Services;

// Резултат от намирането на ученик по имейл
public record StudentLookupResult(string FullName, string ClassName);

// Запис за ученик (за списъци)
public record StudentRecord(string Email, string FullName);

// Клас с учениците в него
public record ClassWithStudents(string Name, IReadOnlyList<StudentRecord> Students);

public interface IStudentDirectoryService
{
    // Дали файлът students.json е наличен и зареден успешно
    bool IsAvailable { get; }

    // Връща всички класове (ключове на JSON обекта)
    IReadOnlyList<string> GetClasses();

    // Търси ученик по имейл (case-insensitive, trimmed)
    // Връща null ако не е намерен или директорията не е достъпна
    StudentLookupResult? FindByEmail(string email);

    // Връща всички класове с учениците им (за UI таблица)
    IReadOnlyList<ClassWithStudents> GetAllClassesWithStudents();

    // CRUD методи — пишат в students.json и презареждат snapshot
    void CreateClass(string name);
    void RenameClass(string oldName, string newName);
    void DeleteClass(string name);
    void AddStudent(string className, string email, string fullName);
    void UpdateStudent(string className, string oldEmail, string newEmail, string fullName);
    void DeleteStudent(string className, string email);
    int BulkAddStudents(string className, IReadOnlyList<StudentRecord> students);
}
