// Стъпка 29 — AuthService.cs
// Услуга за регистрация, влизане и генериране на JWT токени
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TestApp.Api.Data;
using TestApp.Api.Dtos.Auth;
using TestApp.Api.Models;

namespace TestApp.Api.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    // Регистрира нов потребител и връща JWT токен
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        // Проверява дали имейлът вече съществува
        bool emailExists = await _db.Users.AnyAsync(u => u.Email == request.Email);
        if (emailExists)
        {
            throw new InvalidOperationException("Имейлът вече е регистриран.");
        }

        // Хешира паролата с BCrypt
        string passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        // Създава нов потребител (immutable pattern - нов обект)
        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            PasswordHash = passwordHash,
            FullName = request.FullName,
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // Генерира JWT токен
        string token = GenerateToken(user);

        return new AuthResponse
        {
            Token = token,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName
            }
        };
    }

    // Влизане в системата и връщане на JWT токен
    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        // Търси потребителя по имейл
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

        // Проверява дали потребителят съществува и паролата е вярна
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Невалиден имейл или парола.");
        }

        // Генерира JWT токен
        string token = GenerateToken(user);

        return new AuthResponse
        {
            Token = token,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName
            }
        };
    }

    // Генерира JWT токен с claims за потребителя
    private string GenerateToken(AppUser user)
    {
        string secretKey = _config["Jwt:SecretKey"]
            ?? throw new InvalidOperationException("JWT SecretKey не е конфигуриран.");

        string issuer = _config["Jwt:Issuer"] ?? "TestApp";
        string audience = _config["Jwt:Audience"] ?? "TestApp";
        int expirationHours = int.TryParse(_config["Jwt:ExpirationInHours"], out int h) ? h : 24;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Claims с информация за потребителя
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("fullName", user.FullName),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expirationHours),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
