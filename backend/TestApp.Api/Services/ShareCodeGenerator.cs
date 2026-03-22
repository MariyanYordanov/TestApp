// Стъпка 28 — ShareCodeGenerator.cs
// Генератор на уникални кодове за споделяне на тестове
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using TestApp.Api.Data;

namespace TestApp.Api.Services;

public class ShareCodeGenerator : IShareCodeGenerator
{
    // Символи без двусмислени знаци (без O/0/I/1/L)
    private const string Charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private const int CodeLength = 8;
    private const int MaxAttempts = 3;

    private readonly AppDbContext _db;

    public ShareCodeGenerator(AppDbContext db)
    {
        _db = db;
    }

    // Генерира криптографски случаен уникален код
    public async Task<string> GenerateAsync()
    {
        for (int attempt = 0; attempt < MaxAttempts; attempt++)
        {
            string code = GenerateCode();

            // Проверява дали кодът вече съществува
            bool exists = await _db.Tests.AnyAsync(t => t.ShareCode == code);
            if (!exists)
            {
                return code;
            }
        }

        throw new InvalidOperationException("Не може да се генерира уникален код за споделяне.");
    }

    // Генерира случаен код с криптографски сигурен генератор
    private static string GenerateCode()
    {
        char[] chars = new char[CodeLength];

        for (int i = 0; i < CodeLength; i++)
        {
            // Използва криптографски сигурен генератор на случайни числа
            int index = RandomNumberGenerator.GetInt32(Charset.Length);
            chars[i] = Charset[index];
        }

        return new string(chars);
    }
}
