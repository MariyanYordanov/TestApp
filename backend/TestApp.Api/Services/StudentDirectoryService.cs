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
                    string? email = null;
                    string? fullName = null;

                    if (studentEl.TryGetProperty("email", out var emailEl))
                        email = emailEl.GetString();
                    if (studentEl.TryGetProperty("fullName", out var nameEl))
                        fullName = nameEl.GetString();

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
