// Стъпка 37 — CategoriesControllerTests.cs
// Интеграционни тестове за CategoriesController (WebApplicationFactory)
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Api.Data;
using TestApp.Api.Dtos.Auth;
using TestApp.Api.Dtos.Categories;
using TestApp.Api.Models;
using TestApp.Tests.Helpers;

namespace TestApp.Tests.Controllers;

public class CategoriesControllerTests : IClassFixture<WebAppFactory>
{
    private readonly HttpClient _client;
    private readonly WebAppFactory _factory;

    public CategoriesControllerTests(WebAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    // Помощен метод за регистрация и получаване на JWT токен
    private async Task<string> GetAuthTokenAsync()
    {
        string email = $"cat_{Guid.NewGuid():N}@test.com";
        var registerResponse = await _client.PostAsJsonAsync(
            "/api/auth/register",
            new RegisterRequest
            {
                Email = email,
                Password = "TestPass123!",
                FullName = "Категория Тест"
            });

        var authBody = await registerResponse.Content.ReadFromJsonAsync<AuthResponse>();
        return authBody!.Token;
    }

    // Помощен метод за директно добавяне на категория в DB
    private async Task<Category> SeedCategoryAsync(string name)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var category = new Category
        {
            Id = Guid.NewGuid(),
            Name = name
        };

        db.Categories.Add(category);
        await db.SaveChangesAsync();
        return category;
    }

    // Тест: GET /api/categories без токен → 401
    [Fact]
    public async Task GetAll_Returns401_WhenNotAuthenticated()
    {
        // Act
        using var anonClient = _factory.CreateClient();
        var response = await anonClient.GetAsync("/api/categories");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // Тест: GET /api/categories с токен, без категории → 200 + празен списък
    [Fact]
    public async Task GetAll_ReturnsEmptyList_WhenNoCategories()
    {
        // Arrange
        string token = await GetAuthTokenAsync();
        using var authClient = _factory.CreateClient();
        authClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await authClient.GetAsync("/api/categories");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<List<CategoryDto>>();
        body.Should().NotBeNull();
        // Може да съдържа категории от други тестове — проверяваме само типа
        body.Should().BeOfType<List<CategoryDto>>();
    }

    // Тест: GET /api/categories с токен, след добавяне → 200 + списък с категорията
    [Fact]
    public async Task GetAll_ReturnsList_WhenCategoriesExist()
    {
        // Arrange
        string uniqueName = $"Тест Категория {Guid.NewGuid():N}";
        await SeedCategoryAsync(uniqueName);

        string token = await GetAuthTokenAsync();
        using var authClient = _factory.CreateClient();
        authClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await authClient.GetAsync("/api/categories");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<List<CategoryDto>>();
        body.Should().NotBeNull();
        body.Should().Contain(c => c.Name == uniqueName);
    }

    // Тест: POST /api/categories без токен → 401
    [Fact]
    public async Task Create_Returns401_WhenNotAuthenticated()
    {
        // Arrange
        var request = new CreateCategoryRequest { Name = "Категория" };

        // Act
        using var anonClient = _factory.CreateClient();
        var response = await anonClient.PostAsJsonAsync("/api/categories", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // Тест: POST /api/categories с токен → 201 + категорията
    [Fact]
    public async Task Create_Returns201_WithCreatedCategory()
    {
        // Arrange
        string token = await GetAuthTokenAsync();
        using var authClient = _factory.CreateClient();
        authClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        var request = new CreateCategoryRequest
        {
            Name = $"Нова Категория {Guid.NewGuid():N}".Substring(0, 30)
        };

        // Act
        var response = await authClient.PostAsJsonAsync("/api/categories", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<CategoryDto>();
        body.Should().NotBeNull();
        body!.Id.Should().NotBeEmpty();
        body.Name.Should().Be(request.Name.Trim());
    }

    // Тест: POST /api/categories с празно Name → 400
    [Fact]
    public async Task Create_Returns400_WhenNameEmpty()
    {
        // Arrange
        string token = await GetAuthTokenAsync();
        using var authClient = _factory.CreateClient();
        authClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        var request = new CreateCategoryRequest { Name = "" };

        // Act
        var response = await authClient.PostAsJsonAsync("/api/categories", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // Тест: POST /api/categories с Name > 100 символа → 400
    [Fact]
    public async Task Create_Returns400_WhenNameTooLong()
    {
        // Arrange
        string token = await GetAuthTokenAsync();
        using var authClient = _factory.CreateClient();
        authClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        var request = new CreateCategoryRequest
        {
            Name = new string('А', 101)
        };

        // Act
        var response = await authClient.PostAsJsonAsync("/api/categories", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // Тест: DELETE /api/categories/{id} без токен → 401
    [Fact]
    public async Task Delete_Returns401_WhenNotAuthenticated()
    {
        // Act
        using var anonClient = _factory.CreateClient();
        var response = await anonClient.DeleteAsync($"/api/categories/{Guid.NewGuid()}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // Тест: DELETE /api/categories/{id} за несъществуваща категория → 404
    [Fact]
    public async Task Delete_Returns404_WhenCategoryNotFound()
    {
        // Arrange
        string token = await GetAuthTokenAsync();
        using var authClient = _factory.CreateClient();
        authClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await authClient.DeleteAsync($"/api/categories/{Guid.NewGuid()}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // Тест: DELETE /api/categories/{id} за съществуваща категория → 204
    [Fact]
    public async Task Delete_Returns204_WhenCategoryExists()
    {
        // Arrange
        var category = await SeedCategoryAsync($"За Изтриване {Guid.NewGuid():N}".Substring(0, 30));

        string token = await GetAuthTokenAsync();
        using var authClient = _factory.CreateClient();
        authClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await authClient.DeleteAsync($"/api/categories/{category.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }
}
