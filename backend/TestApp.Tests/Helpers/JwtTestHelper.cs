// Стъпка 35 — JwtTestHelper.cs
// Помощник за генериране на JWT токени в тестове
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace TestApp.Tests.Helpers;

public static class JwtTestHelper
{
    // Тестов секретен ключ (32+ символа)
    public const string TestSecretKey = "test-secret-key-minimum-32-characters-long!!";
    public const string TestIssuer = "TestApp";
    public const string TestAudience = "TestApp";

    // Генерира валиден JWT токен за тестове
    public static string GenerateToken(
        Guid userId,
        string email = "test@test.com",
        string fullName = "Тест Потребител")
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestSecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim("fullName", fullName),
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: TestIssuer,
            audience: TestAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
