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

    public TestsController(ITestService testService)
    {
        _testService = testService;
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

        var result = await _testService.SubmitAttemptAsync(shareCode, request);

        if (result is null)
        {
            return NotFound(new { error = "Тестът не е намерен." });
        }

        return Ok(result);
    }

    // Опитва да извлече userId от JWT токена — връща false ако липсва claim
    private bool TryGetCurrentUserId(out Guid userId)
    {
        userId = Guid.Empty;
        string? userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return !string.IsNullOrEmpty(userIdStr) && Guid.TryParse(userIdStr, out userId);
    }
}
