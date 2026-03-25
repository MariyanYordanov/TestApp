// Стъпка 32 — Program.cs
// Точка на влизане в приложението
using TestApp.Api.Data;
using TestApp.Api.Extensions;
using TestApp.Api.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Регистрира услугите
builder.Services.AddAppServices(builder.Configuration);
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddAppRateLimiting(builder.Environment);
builder.Services.AddControllers();
builder.Services.AddAuthorization();

var app = builder.Build();

// Мигрира базата данни и зарежда начални данни само в Development
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    if (app.Environment.IsDevelopment())
    {
        await SeedData.SeedAsync(db);
    }
}

// Конфигурира HTTP pipeline
app.UseMiddleware<ExceptionMiddleware>();

// Сигурносни хедъри
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("Content-Security-Policy",
        "default-src 'self'; " +
        "script-src 'self' https://cdn.jsdelivr.net; " +
        "style-src 'self' https://cdn.jsdelivr.net; " +
        "font-src 'self' https://cdn.jsdelivr.net; " +
        "img-src 'self' data:; " +
        "connect-src 'self'; " +
        "frame-ancestors 'none'; " +
        "object-src 'none';");
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});

app.UseCors("FrontendPolicy");
if (!app.Environment.IsEnvironment("Testing"))
    app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

// Необходимо за WebApplicationFactory в тестовете
public partial class Program { }
