// ClassesEndpointTests.cs
// RED тестове за GET /api/tests/classes endpoint — Phase 1.C
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Api.Services;
using TestApp.Tests.Helpers;
using Moq;

namespace TestApp.Tests.Controllers;

public class ClassesEndpointTests : IClassFixture<WebAppFactory>
{
    private readonly WebAppFactory _factory;

    public ClassesEndpointTests(WebAppFactory factory)
    {
        _factory = factory;
    }

    // Builds a client with a mocked IStudentDirectoryService
    private HttpClient CreateClientWithDirectory(IStudentDirectoryService directoryService)
    {
        return _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Премахваме всички регистрации на IStudentDirectoryService
                var existing = services
                    .Where(d => d.ServiceType == typeof(IStudentDirectoryService))
                    .ToList();
                foreach (var svc in existing)
                    services.Remove(svc);

                services.AddSingleton(directoryService);
            });
        }).CreateClient();
    }

    // GET /api/tests/classes — връща списък от класове когато директорията е достъпна
    [Fact]
    public async Task GetClasses_ReturnsClassList_WhenDirectoryAvailable()
    {
        // Arrange
        var mockDir = new Mock<IStudentDirectoryService>();
        mockDir.Setup(d => d.IsAvailable).Returns(true);
        mockDir.Setup(d => d.GetClasses()).Returns(new List<string> { "9А", "9Б", "10А" });

        var client = CreateClientWithDirectory(mockDir.Object);

        // Act
        var response = await client.GetAsync("/api/tests/classes");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<List<string>>();
        body.Should().NotBeNull();
        body!.Should().Contain("9А");
        body.Should().Contain("10А");
    }

    // GET /api/tests/classes — връща празен масив когато директорията не е достъпна
    [Fact]
    public async Task GetClasses_ReturnsEmptyList_WhenDirectoryUnavailable()
    {
        // Arrange
        var mockDir = new Mock<IStudentDirectoryService>();
        mockDir.Setup(d => d.IsAvailable).Returns(false);
        mockDir.Setup(d => d.GetClasses()).Returns(new List<string>());

        var client = CreateClientWithDirectory(mockDir.Object);

        // Act
        var response = await client.GetAsync("/api/tests/classes");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<List<string>>();
        body.Should().NotBeNull();
        body!.Should().BeEmpty();
    }

    // GET /api/tests/classes — не изисква JWT (публичен endpoint)
    [Fact]
    public async Task GetClasses_DoesNotRequireAuth()
    {
        // Arrange — без JWT токен
        var mockDir = new Mock<IStudentDirectoryService>();
        mockDir.Setup(d => d.IsAvailable).Returns(true);
        mockDir.Setup(d => d.GetClasses()).Returns(new List<string> { "9А" });

        var client = CreateClientWithDirectory(mockDir.Object);

        // Act
        var response = await client.GetAsync("/api/tests/classes");

        // Assert — не е 401
        response.StatusCode.Should().NotBe(HttpStatusCode.Unauthorized);
    }
}
