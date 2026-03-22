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
app.UseCors("FrontendPolicy");
if (!app.Environment.IsEnvironment("Testing"))
    app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

// Необходимо за WebApplicationFactory в тестовете
public partial class Program { }
