// Стъпка 33 — AuthController.cs
// Контролер за регистрация и влизане в системата
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using TestApp.Api.Dtos.Auth;
using TestApp.Api.Services;

namespace TestApp.Api.Controllers;

[Route("api/auth")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    // POST api/auth/register — регистрация на нов потребител (с rate limiting)
    [HttpPost("register")]
    [EnableRateLimiting("AuthPolicy")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        // Валидацията се извършва автоматично от [ApiController]
        var response = await _authService.RegisterAsync(request);

        // 201 Created с информацията за потребителя
        return StatusCode(StatusCodes.Status201Created, response);
    }

    // POST api/auth/login — влизане в системата (с rate limiting)
    [HttpPost("login")]
    [EnableRateLimiting("AuthPolicy")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var response = await _authService.LoginAsync(request);

        // 200 OK с JWT токен
        return Ok(response);
    }
}
