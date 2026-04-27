// StudentDirectoryServiceTests.cs
// RED тестове за IStudentDirectoryService — Phase 1.B
// Покрива: зареждане от JSON, case-insensitive lookup, missing file, hot-reload, malformed JSON
using System.Text.Json;
using FluentAssertions;
using TestApp.Api.Services;

namespace TestApp.Tests.Services;

public class StudentDirectoryServiceTests : IDisposable
{
    private readonly string _tempDir;

    public StudentDirectoryServiceTests()
    {
        // Всеки тест получава уникална temp директория
        _tempDir = Path.Combine(Path.GetTempPath(), $"testapp_sds_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);
    }

    public void Dispose()
    {
        // Изчиства temp директорията след тестовете
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, recursive: true);
    }

    // Помощен метод — пише JSON файл в temp директорията
    private string WriteStudentsJson(object content)
    {
        var path = Path.Combine(_tempDir, "students.json");
        File.WriteAllText(path, JsonSerializer.Serialize(content));
        return path;
    }

    // Помощен метод — създава service с посочен json файл
    private IStudentDirectoryService CreateService(string jsonPath)
    {
        return new StudentDirectoryService(jsonPath);
    }

    // --- Тест 1: Зарежда всички класове от JSON ---
    [Fact]
    public void LoadJson_ParsesAllClasses()
    {
        // Arrange
        var data = new Dictionary<string, object[]>
        {
            ["9А"] = new object[]
            {
                new { email = "ivan@school.bg", fullName = "Иван Иванов" },
                new { email = "maria@school.bg", fullName = "Мария Иванова" },
            },
            ["10Б"] = new object[]
            {
                new { email = "georgi@school.bg", fullName = "Георги Колев" }
            }
        };
        var path = WriteStudentsJson(data);
        var service = CreateService(path);

        // Act
        var classes = service.GetClasses();

        // Assert
        classes.Should().HaveCount(2);
        classes.Should().Contain("9А");
        classes.Should().Contain("10Б");
        service.IsAvailable.Should().BeTrue();
    }

    // --- Тест 2: FindByEmail е case-insensitive ---
    [Fact]
    public void FindByEmail_CaseInsensitive()
    {
        // Arrange
        var data = new Dictionary<string, object[]>
        {
            ["9А"] = new object[]
            {
                new { email = "Ivan.Petrov@School.BG", fullName = "Иван Петров Иванов" }
            }
        };
        var path = WriteStudentsJson(data);
        var service = CreateService(path);

        // Act — търсим с малки букви
        var result = service.FindByEmail("ivan.petrov@school.bg");

        // Assert
        result.Should().NotBeNull();
        result!.FullName.Should().Be("Иван Петров Иванов");
        result.ClassName.Should().Be("9А");
    }

    // --- Тест 3: FindByEmail — неоткрит имейл → null ---
    [Fact]
    public void FindByEmail_NotFound_ReturnsNull()
    {
        // Arrange
        var data = new Dictionary<string, object[]>
        {
            ["9А"] = new object[]
            {
                new { email = "known@school.bg", fullName = "Известен Ученик" }
            }
        };
        var path = WriteStudentsJson(data);
        var service = CreateService(path);

        // Act
        var result = service.FindByEmail("unknown@school.bg");

        // Assert
        result.Should().BeNull();
    }

    // --- Тест 4: Липсващ файл → IsAvailable=false, GetClasses=[]] ---
    [Fact]
    public void MissingFile_IsAvailableFalse()
    {
        // Arrange — path към несъществуващ файл
        var missingPath = Path.Combine(_tempDir, "nonexistent.json");
        var service = CreateService(missingPath);

        // Act & Assert
        service.IsAvailable.Should().BeFalse();
        service.GetClasses().Should().BeEmpty();
        service.FindByEmail("any@school.bg").Should().BeNull();
    }

    // --- Тест 5: Hot-reload — прочита промените след запис ---
    [Fact]
    public async Task HotReload_PicksUpChanges()
    {
        // Arrange — първоначален JSON с 1 клас
        var initialData = new Dictionary<string, object[]>
        {
            ["9А"] = new object[]
            {
                new { email = "initial@school.bg", fullName = "Начален Ученик" }
            }
        };
        var path = WriteStudentsJson(initialData);
        var service = CreateService(path);

        // Verify initial state
        service.GetClasses().Should().ContainSingle("9А");
        service.FindByEmail("initial@school.bg").Should().NotBeNull();

        // Act — обновяваме файла с нови данни
        var updatedData = new Dictionary<string, object[]>
        {
            ["9А"] = new object[]
            {
                new { email = "initial@school.bg", fullName = "Начален Ученик" }
            },
            ["10В"] = new object[]
            {
                new { email = "new@school.bg", fullName = "Нов Ученик" }
            }
        };
        File.WriteAllText(path, JsonSerializer.Serialize(updatedData));

        // Изчакваме debounce (500ms) + малко buffer
        await Task.Delay(800);

        // Assert — новите данни са заредени
        service.GetClasses().Should().Contain("10В");
        service.FindByEmail("new@school.bg").Should().NotBeNull();
    }

    // --- Тест 6: Malformed JSON → запазва последния добър snapshot ---
    [Fact]
    public async Task MalformedJson_KeepsLastKnownGood()
    {
        // Arrange — първо зареждаме валиден JSON
        var validData = new Dictionary<string, object[]>
        {
            ["9А"] = new object[]
            {
                new { email = "valid@school.bg", fullName = "Валиден Ученик" }
            }
        };
        var path = WriteStudentsJson(validData);
        var service = CreateService(path);

        // Verify initial valid state
        service.IsAvailable.Should().BeTrue();
        service.FindByEmail("valid@school.bg").Should().NotBeNull();

        // Act — записваме невалиден JSON
        File.WriteAllText(path, "{ invalid json !!!");
        await Task.Delay(800);

        // Assert — предишният snapshot е запазен
        service.IsAvailable.Should().BeTrue();
        service.FindByEmail("valid@school.bg").Should().NotBeNull();
    }
}
