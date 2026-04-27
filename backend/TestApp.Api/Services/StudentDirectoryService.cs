// StudentDirectoryService.cs
// Singleton услуга за четене на students.json с FileSystemWatcher hot-reload.
// Thread-safe чрез ReaderWriterLockSlim + immutable snapshot.
// При malformed JSON — запазва предишния валиден snapshot.
// При missing file — IsAvailable=false, gate disabled в UI (fail-open за student access).
using System.Text.Json;

namespace TestApp.Api.Services;

public class StudentDirectoryService : IStudentDirectoryService, IDisposable
{
    // Вътрешен immutable snapshot — заменя се изцяло при reload
    private record DirectorySnapshot(
        bool IsAvailable,
        // Email (normalized) → (fullName, className)
        IReadOnlyDictionary<string, (string FullName, string ClassName)> Entries,
        IReadOnlyList<string> Classes
    );

    private static readonly DirectorySnapshot EmptySnapshot = new(
        IsAvailable: false,
        Entries: new Dictionary<string, (string, string)>(),
        Classes: Array.Empty<string>()
    );

    private readonly string _jsonPath;
    private readonly ReaderWriterLockSlim _lock = new();
    private readonly FileSystemWatcher? _watcher;
    private readonly ILogger<StudentDirectoryService>? _logger;
    private DirectorySnapshot _snapshot = EmptySnapshot;

    // Timer за debounce (500ms) на FileSystemWatcher events
    private System.Threading.Timer? _debounceTimer;
    private const int DebounceMs = 500;

    public StudentDirectoryService(string jsonPath, ILogger<StudentDirectoryService>? logger = null)
    {
        _jsonPath = jsonPath;
        _logger = logger;

        // Зарежда началния snapshot
        TryLoadSnapshot();

        // Настройва FileSystemWatcher за hot-reload
        var dir = Path.GetDirectoryName(jsonPath);
        var fileName = Path.GetFileName(jsonPath);

        if (dir != null && Directory.Exists(dir))
        {
            _watcher = new FileSystemWatcher(dir, fileName)
            {
                NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.CreationTime,
                EnableRaisingEvents = true
            };

            _watcher.Changed += OnFileChanged;
            _watcher.Created += OnFileChanged;
            _watcher.Deleted += OnFileDeleted;
        }
    }

    public bool IsAvailable
    {
        get
        {
            _lock.EnterReadLock();
            try { return _snapshot.IsAvailable; }
            finally { _lock.ExitReadLock(); }
        }
    }

    public IReadOnlyList<string> GetClasses()
    {
        _lock.EnterReadLock();
        try { return _snapshot.Classes; }
        finally { _lock.ExitReadLock(); }
    }

    public StudentLookupResult? FindByEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email)) return null;

        var normalized = email.Trim().ToLowerInvariant();

        _lock.EnterReadLock();
        try
        {
            if (!_snapshot.IsAvailable) return null;
            if (_snapshot.Entries.TryGetValue(normalized, out var found))
                return new StudentLookupResult(found.FullName, found.ClassName);
            return null;
        }
        finally { _lock.ExitReadLock(); }
    }

    // ---------------------------------------------------------------------
    // CRUD методи — четат, мутират и записват students.json. След запис
    // FileSystemWatcher автоматично презарежда snapshot-а (debounced).
    // Използваме _writeLock за сериализиране на write операциите.
    // ---------------------------------------------------------------------
    private readonly object _writeLock = new();

    public IReadOnlyList<ClassWithStudents> GetAllClassesWithStudents()
    {
        _lock.EnterReadLock();
        try
        {
            if (!_snapshot.IsAvailable) return Array.Empty<ClassWithStudents>();

            // Групираме entries по className
            var byClass = _snapshot.Classes
                .Select(cls => new ClassWithStudents(
                    cls,
                    _snapshot.Entries
                        .Where(e => e.Value.ClassName == cls)
                        .Select(e => new StudentRecord(e.Key, e.Value.FullName))
                        .OrderBy(s => s.FullName)
                        .ToList()
                ))
                .ToList();

            return byClass;
        }
        finally { _lock.ExitReadLock(); }
    }

    public void CreateClass(string name)
    {
        ValidateClassName(name);
        lock (_writeLock)
        {
            var data = LoadRaw();
            if (data.ContainsKey(name))
                throw new InvalidOperationException($"Клас '{name}' вече съществува.");
            data[name] = new List<StudentRecord>();
            SaveRaw(data);
        }
    }

    public void RenameClass(string oldName, string newName)
    {
        ValidateClassName(newName);
        lock (_writeLock)
        {
            var data = LoadRaw();
            if (!data.TryGetValue(oldName, out var students))
                throw new InvalidOperationException($"Клас '{oldName}' не е намерен.");
            if (data.ContainsKey(newName) && oldName != newName)
                throw new InvalidOperationException($"Клас '{newName}' вече съществува.");

            // Запазваме реда — пресъздаваме речника
            var renamed = new Dictionary<string, List<StudentRecord>>();
            foreach (var (key, val) in data)
                renamed[key == oldName ? newName : key] = val;
            SaveRaw(renamed);
        }
    }

    public void DeleteClass(string name)
    {
        lock (_writeLock)
        {
            var data = LoadRaw();
            if (!data.Remove(name))
                throw new InvalidOperationException($"Клас '{name}' не е намерен.");
            SaveRaw(data);
        }
    }

    public void AddStudent(string className, string email, string fullName)
    {
        ValidateEmail(email);
        ValidateFullName(fullName);
        lock (_writeLock)
        {
            var data = LoadRaw();
            if (!data.TryGetValue(className, out var students))
                throw new InvalidOperationException($"Клас '{className}' не е намерен.");

            var normalized = email.Trim().ToLowerInvariant();
            // Проверка за дубликат във ВСИЧКИ класове
            foreach (var (cls, list) in data)
            {
                if (list.Any(s => s.Email.Equals(normalized, StringComparison.OrdinalIgnoreCase)))
                    throw new InvalidOperationException(
                        $"Имейлът '{email}' вече съществува в клас '{cls}'.");
            }

            students.Add(new StudentRecord(normalized, fullName.Trim()));
            SaveRaw(data);
        }
    }

    public void UpdateStudent(string className, string oldEmail, string newEmail, string fullName)
    {
        ValidateEmail(newEmail);
        ValidateFullName(fullName);
        lock (_writeLock)
        {
            var data = LoadRaw();
            if (!data.TryGetValue(className, out var students))
                throw new InvalidOperationException($"Клас '{className}' не е намерен.");

            var normalizedOld = oldEmail.Trim().ToLowerInvariant();
            var normalizedNew = newEmail.Trim().ToLowerInvariant();
            var index = students.FindIndex(s =>
                s.Email.Equals(normalizedOld, StringComparison.OrdinalIgnoreCase));
            if (index < 0)
                throw new InvalidOperationException($"Ученикът с имейл '{oldEmail}' не е намерен.");

            // Ако имейлът се променя — провери за дубликат
            if (normalizedOld != normalizedNew)
            {
                foreach (var (cls, list) in data)
                {
                    if (list.Any(s => s.Email.Equals(normalizedNew, StringComparison.OrdinalIgnoreCase)))
                        throw new InvalidOperationException(
                            $"Имейлът '{newEmail}' вече съществува в клас '{cls}'.");
                }
            }

            students[index] = new StudentRecord(normalizedNew, fullName.Trim());
            SaveRaw(data);
        }
    }

    public void DeleteStudent(string className, string email)
    {
        lock (_writeLock)
        {
            var data = LoadRaw();
            if (!data.TryGetValue(className, out var students))
                throw new InvalidOperationException($"Клас '{className}' не е намерен.");

            var normalized = email.Trim().ToLowerInvariant();
            var removed = students.RemoveAll(s =>
                s.Email.Equals(normalized, StringComparison.OrdinalIgnoreCase));
            if (removed == 0)
                throw new InvalidOperationException($"Ученикът с имейл '{email}' не е намерен.");

            SaveRaw(data);
        }
    }

    public int BulkAddStudents(string className, IReadOnlyList<StudentRecord> students)
    {
        if (students == null || students.Count == 0) return 0;

        lock (_writeLock)
        {
            var data = LoadRaw();
            if (!data.TryGetValue(className, out var existing))
                throw new InvalidOperationException($"Клас '{className}' не е намерен.");

            // Събираме всички съществуващи имейли (от всички класове) за дубликат проверка
            var allEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var (_, list) in data)
                foreach (var s in list) allEmails.Add(s.Email);

            int added = 0;
            foreach (var s in students)
            {
                if (string.IsNullOrWhiteSpace(s.Email) || string.IsNullOrWhiteSpace(s.FullName))
                    continue;
                try { ValidateEmail(s.Email); } catch { continue; }

                var normalized = s.Email.Trim().ToLowerInvariant();
                if (allEmails.Contains(normalized)) continue;

                existing.Add(new StudentRecord(normalized, s.FullName.Trim()));
                allEmails.Add(normalized);
                added++;
            }

            if (added > 0) SaveRaw(data);
            return added;
        }
    }

    // ---- Помощни ----

    private Dictionary<string, List<StudentRecord>> LoadRaw()
    {
        if (!File.Exists(_jsonPath))
            return new Dictionary<string, List<StudentRecord>>();

        var json = File.ReadAllText(_jsonPath);
        var parsed = JsonSerializer.Deserialize<Dictionary<string, List<StudentRecord>>>(
            json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? new Dictionary<string, List<StudentRecord>>();
        return parsed;
    }

    private void SaveRaw(Dictionary<string, List<StudentRecord>> data)
    {
        // Гарантира съществуването на директорията
        var dir = Path.GetDirectoryName(_jsonPath);
        if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            Directory.CreateDirectory(dir);

        var json = JsonSerializer.Serialize(data, new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        });

        // Atomic write: пише в .tmp, после rename. Защитава от corruption при crash.
        var tmpPath = _jsonPath + ".tmp";
        File.WriteAllText(tmpPath, json);
        if (File.Exists(_jsonPath)) File.Delete(_jsonPath);
        File.Move(tmpPath, _jsonPath);

        // Принудително презарежда snapshot веднага (без да чака FileSystemWatcher)
        TryLoadSnapshot();
    }

    private static void ValidateClassName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Името на класа е задължително.");
        if (name.Length > 20)
            throw new InvalidOperationException("Името на класа е твърде дълго (макс 20 символа).");
    }

    private static readonly System.Text.RegularExpressions.Regex EmailRegex = new(
        @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        System.Text.RegularExpressions.RegexOptions.Compiled);

    private static void ValidateEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new InvalidOperationException("Имейлът е задължителен.");
        if (!EmailRegex.IsMatch(email.Trim()))
            throw new InvalidOperationException($"Невалиден имейл формат: '{email}'.");
    }

    private static void ValidateFullName(string fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            throw new InvalidOperationException("Името е задължително.");
        if (fullName.Length > 200)
            throw new InvalidOperationException("Името е твърде дълго (макс 200 символа).");
    }

    // Зарежда/презарежда snapshot от файла
    private void TryLoadSnapshot()
    {
        if (!File.Exists(_jsonPath))
        {
            SetSnapshot(EmptySnapshot);
            return;
        }

        try
        {
            var json = File.ReadAllText(_jsonPath);
            var parsed = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json);

            if (parsed == null)
            {
                _logger?.LogWarning("students.json e null след десериализация.");
                return; // запазваме предишния snapshot
            }

            var entries = new Dictionary<string, (string, string)>(StringComparer.Ordinal);
            var classes = new List<string>();

            foreach (var (className, studentsEl) in parsed)
            {
                classes.Add(className);

                if (studentsEl.ValueKind != JsonValueKind.Array) continue;

                foreach (var studentEl in studentsEl.EnumerateArray())
                {
                    // Толерантно четене — приема и camelCase, и PascalCase
                    string? email = TryReadString(studentEl, "email", "Email");
                    string? fullName = TryReadString(studentEl, "fullName", "FullName");

                    if (email == null || fullName == null) continue;

                    var normalizedEmail = email.Trim().ToLowerInvariant();
                    entries[normalizedEmail] = (fullName, className);
                }
            }

            SetSnapshot(new DirectorySnapshot(
                IsAvailable: true,
                Entries: entries,
                Classes: classes
            ));

            _logger?.LogInformation("students.json зареден успешно: {Count} класа.", classes.Count);
        }
        catch (JsonException ex)
        {
            _logger?.LogError(ex, "Невалиден JSON в students.json — запазва се предишният snapshot.");
            // Не обновяваме _snapshot — запазваме последния валиден
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Грешка при зареждане на students.json.");
        }
    }

    // Толерантно четене на string property — пробва списък имена
    private static string? TryReadString(JsonElement el, params string[] names)
    {
        foreach (var name in names)
        {
            if (el.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.String)
                return prop.GetString();
        }
        return null;
    }

    private void SetSnapshot(DirectorySnapshot snapshot)
    {
        _lock.EnterWriteLock();
        try { _snapshot = snapshot; }
        finally { _lock.ExitWriteLock(); }
    }

    // FileSystemWatcher event handler — debounced
    private void OnFileChanged(object sender, FileSystemEventArgs e)
    {
        // Нулираме debounce timer-а
        _debounceTimer?.Change(DebounceMs, Timeout.Infinite);
        _debounceTimer ??= new System.Threading.Timer(_ => TryLoadSnapshot(), null, DebounceMs, Timeout.Infinite);
        _debounceTimer.Change(DebounceMs, Timeout.Infinite);
    }

    private void OnFileDeleted(object sender, FileSystemEventArgs e)
    {
        _debounceTimer?.Change(DebounceMs, Timeout.Infinite);
        _debounceTimer ??= new System.Threading.Timer(_ => SetSnapshot(EmptySnapshot), null, DebounceMs, Timeout.Infinite);
        _debounceTimer.Change(DebounceMs, Timeout.Infinite);
    }

    public void Dispose()
    {
        _debounceTimer?.Dispose();
        _watcher?.Dispose();
        _lock.Dispose();
    }
}
