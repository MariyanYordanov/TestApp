// Стъпка 34 — TestsController.cs
// Контролер за управление на тестове
using System.Security.Claims;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TestApp.Api.Dtos.Tests;
using TestApp.Api.Services;

namespace TestApp.Api.Controllers;

[Route("api/tests")]
[ApiController]
public class TestsController : ControllerBase
{
    private readonly ITestService _testService;
    private readonly IStudentDirectoryService _studentDirectory;

    public TestsController(ITestService testService, IStudentDirectoryService studentDirectory)
    {
        _testService = testService;
        _studentDirectory = studentDirectory;
    }

    // GET api/tests/classes — списък с класове от students.json (за dropdown в wizard-а)
    // Публичен endpoint — не изисква JWT
    [HttpGet("classes")]
    [AllowAnonymous]
    public IActionResult GetClasses()
    {
        var classes = _studentDirectory.GetClasses();
        return Ok(classes);
    }

    // GET api/tests — списък с тестовете на текущия потребител
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetMyTests()
    {
        if (!TryGetCurrentUserId(out Guid ownerId))
            return Unauthorized(new { error = "Невалиден токен." });

        var tests = await _testService.GetTestsByOwnerAsync(ownerId);
        return Ok(tests);
    }

    // POST api/tests — създаване на нов тест
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateTest([FromBody] CreateTestRequest request)
    {
        if (!TryGetCurrentUserId(out Guid ownerId))
            return Unauthorized(new { error = "Невалиден токен." });

        var test = await _testService.CreateTestAsync(request, ownerId);
        return StatusCode(StatusCodes.Status201Created, test);
    }

    // GET api/tests/{shareCode} — публичен изглед на тест по код за споделяне
    [HttpGet("{shareCode}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicTest(string shareCode)
    {
        // Валидира формата на shareCode преди заявка към базата данни
        if (string.IsNullOrEmpty(shareCode) || shareCode.Length != 8
            || !System.Text.RegularExpressions.Regex.IsMatch(shareCode, @"^[A-Z0-9]{8}$"))
        {
            return NotFound(new { error = "Тестът не е намерен." });
        }

        var test = await _testService.GetPublicTestAsync(shareCode);

        if (test is null)
        {
            return NotFound(new { error = "Тестът не е намерен." });
        }

        return Ok(test);
    }

    // GET api/tests/{id:guid} — пълен изглед на тест за учителя
    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> GetFullTest(Guid id)
    {
        if (!TryGetCurrentUserId(out Guid ownerId))
            return Unauthorized(new { error = "Невалиден токен." });

        var test = await _testService.GetFullTestAsync(id, ownerId);

        if (test is null)
        {
            return NotFound(new { error = "Тестът не е намерен." });
        }

        return Ok(test);
    }

    // GET api/tests/{id}/attempts — връща опитите за тест (само собственикът)
    [HttpGet("{id:guid}/attempts")]
    [Authorize]
    public async Task<IActionResult> GetAttempts(Guid id)
    {
        if (!TryGetCurrentUserId(out var ownerId))
            return Unauthorized(new { error = "Невалиден токен." });

        var attempts = await _testService.GetAttemptsByTestAsync(id, ownerId);
        return Ok(attempts);
    }

    // PUT api/tests/{id} — обновява тест (заглавие, въпроси, категории)
    [HttpPut("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> UpdateTest(Guid id, [FromBody] CreateTestRequest request)
    {
        if (!TryGetCurrentUserId(out Guid ownerId))
            return Unauthorized(new { error = "Невалиден токен." });

        var result = await _testService.UpdateTestAsync(id, request, ownerId);

        if (result is null)
            return NotFound(new { error = "Тестът не е намерен." });

        return Ok(result);
    }

    // DELETE api/tests/{id} — изтрива тест
    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> DeleteTest(Guid id)
    {
        if (!TryGetCurrentUserId(out Guid ownerId))
            return Unauthorized(new { error = "Невалиден токен." });

        var success = await _testService.DeleteTestAsync(id, ownerId);

        if (!success)
            return NotFound(new { error = "Тестът не е намерен." });

        return NoContent();
    }

    // PUT api/tests/{id}/publish — публикува тест (Draft → Published)
    [HttpPut("{id:guid}/publish")]
    [Authorize]
    public async Task<IActionResult> PublishTest(Guid id)
    {
        if (!TryGetCurrentUserId(out Guid ownerId))
            return Unauthorized(new { error = "Невалиден токен." });

        var success = await _testService.PublishTestAsync(id, ownerId);

        if (!success)
            return NotFound(new { error = "Тестът не е намерен." });

        return NoContent();
    }

    // PUT api/tests/{id}/archive — архивира тест (Published/Draft → Archived)
    [HttpPut("{id:guid}/archive")]
    [Authorize]
    public async Task<IActionResult> ArchiveTest(Guid id)
    {
        if (!TryGetCurrentUserId(out Guid ownerId))
            return Unauthorized(new { error = "Невалиден токен." });

        var success = await _testService.ArchiveTestAsync(id, ownerId);

        if (!success)
            return NotFound(new { error = "Тестът не е намерен." });

        return NoContent();
    }

    // PUT api/tests/{id}/restore — възстановява архивиран тест към Draft
    [HttpPut("{id:guid}/restore")]
    [Authorize]
    public async Task<IActionResult> RestoreTest(Guid id)
    {
        if (!TryGetCurrentUserId(out Guid ownerId))
            return Unauthorized(new { error = "Невалиден токен." });

        var success = await _testService.RestoreTestAsync(id, ownerId);

        if (!success)
            return NotFound(new { error = "Тестът не е намерен." });

        return NoContent();
    }

    // POST api/tests/{shareCode}/verify-participant — проверява дали ученик може да реши теста
    // (class gate + single-attempt). Връща канонизирано име при успех.
    [HttpPost("{shareCode}/verify-participant")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyParticipant(string shareCode, [FromBody] VerifyParticipantRequest request)
    {
        if (string.IsNullOrEmpty(shareCode) || shareCode.Length != 8
            || !System.Text.RegularExpressions.Regex.IsMatch(shareCode, @"^[A-Z0-9]{8}$"))
        {
            return NotFound(new { error = "Тестът не е намерен." });
        }

        try
        {
            var canonicalName = await _testService.VerifyParticipantAsync(shareCode, request.ParticipantName);
            if (canonicalName is null)
                return NotFound(new { error = "Тестът не е намерен." });
            return Ok(new { fullName = canonicalName });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = ex.Message });
        }
    }

    // POST api/tests/{shareCode}/attempts — предаване на опит (с rate limiting)
    [HttpPost("{shareCode}/attempts")]
    [AllowAnonymous]
    [EnableRateLimiting("PublicPolicy")]
    public async Task<IActionResult> SubmitAttempt(
        string shareCode,
        [FromBody] SubmitAttemptRequest request)
    {
        // Валидира формата на shareCode
        if (string.IsNullOrEmpty(shareCode) || shareCode.Length != 8
            || !System.Text.RegularExpressions.Regex.IsMatch(shareCode, @"^[A-Z0-9]{8}$"))
        {
            return NotFound(new { error = "Тестът не е намерен." });
        }

        try
        {
            var result = await _testService.SubmitAttemptAsync(shareCode, request);

            if (result is null)
            {
                return NotFound(new { error = "Тестът не е намерен." });
            }

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            // Class gate refusal или single-attempt — връщаме 403 с описателен message
            return StatusCode(StatusCodes.Status403Forbidden, new { error = ex.Message });
        }
    }

    // GET api/tests/{testId}/attempts/{attemptId} — детайлен преглед на опит (само за собственика)
    [HttpGet("{testId:guid}/attempts/{attemptId:guid}")]
    [Authorize]
    public async Task<IActionResult> GetAttemptDetail(Guid testId, Guid attemptId)
    {
        if (!TryGetCurrentUserId(out Guid ownerId))
            return Unauthorized(new { error = "Невалиден токен." });

        var result = await _testService.GetAttemptDetailAsync(testId, attemptId, ownerId);
        if (result is null)
            return NotFound(new { error = "Опитът не е намерен." });

        return Ok(result);
    }

    // POST api/tests/{testId}/attempts/{attemptId}/grade — стартира AI оценяване
    [HttpPost("{testId:guid}/attempts/{attemptId:guid}/grade")]
    [Authorize]
    public async Task<IActionResult> GradeAttempt(Guid testId, Guid attemptId)
    {
        if (!TryGetCurrentUserId(out Guid ownerId))
            return Unauthorized(new { error = "Невалиден токен." });

        var success = await _testService.GradeAttemptAsync(testId, attemptId, ownerId);
        if (!success)
            return NotFound(new { error = "Опитът не е намерен." });

        return Ok(new { message = "Оценяването завърши." });
    }

    // POST api/tests/{shareCode}/resolve-email — ученикът проверява дали имейлът му е в директорията
    // Публичен endpoint — не изисква JWT
    [HttpPost("{shareCode}/resolve-email")]
    [AllowAnonymous]
    [EnableRateLimiting("PublicPolicy")]
    public IActionResult ResolveEmail(string shareCode, [FromBody] ResolveEmailRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { error = "Имейлът е задължителен." });

        if (!_studentDirectory.IsAvailable)
            return StatusCode(503, new { error = "Директорията с ученици не е достъпна." });

        var normalized = request.Email.Trim().ToLowerInvariant();
        var result = _studentDirectory.FindByEmail(normalized);

        if (result is null)
            return NotFound(new { error = "Имейлът не е намерен в директорията." });

        return Ok(new { fullName = result.FullName, className = result.ClassName });
    }

    // POST api/tests/{testId}/attempts/{attemptId}/void — учителят анулира опит
    [HttpPost("{testId:guid}/attempts/{attemptId:guid}/void")]
    [Authorize]
    public async Task<IActionResult> VoidAttempt(Guid testId, Guid attemptId)
    {
        if (!TryGetCurrentUserId(out Guid ownerId))
            return Unauthorized(new { error = "Невалиден токен." });

        var success = await _testService.VoidAttemptAsync(testId, attemptId, ownerId);
        if (!success)
            return NotFound(new { error = "Опитът не е намерен." });

        return Ok(new { message = "Опитът е анулиран. Ученикът може да предаде отново." });
    }

    // Опитва да извлече userId от JWT токена — връща false ако липсва claim
    private bool TryGetCurrentUserId(out Guid userId)
    {
        userId = Guid.Empty;
        string? userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return !string.IsNullOrEmpty(userIdStr) && Guid.TryParse(userIdStr, out userId);
    }
}

// DTO за resolve-email заявка
public class ResolveEmailRequest
{
    public string Email { get; set; } = string.Empty;
}

// DTO за verify-participant заявка
public class VerifyParticipantRequest
{
    public string ParticipantName { get; set; } = string.Empty;
}
