// ClassesController.cs
// CRUD endpoints за управление на класове и ученици в students.json.
// Само автентицирани учители имат достъп.
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TestApp.Api.Services;

namespace TestApp.Api.Controllers;

[Route("api/classes")]
[ApiController]
[Authorize]
public class ClassesController : ControllerBase
{
    private readonly IStudentDirectoryService _directory;

    public ClassesController(IStudentDirectoryService directory)
    {
        _directory = directory;
    }

    // GET /api/classes — всички класове с учениците им
    [HttpGet]
    public IActionResult GetAll()
    {
        var classes = _directory.GetAllClassesWithStudents();
        return Ok(classes);
    }

    // POST /api/classes — нов клас { name }
    [HttpPost]
    public IActionResult CreateClass([FromBody] CreateClassRequest request)
    {
        try
        {
            _directory.CreateClass(request.Name);
            return StatusCode(StatusCodes.Status201Created, new { name = request.Name });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // PUT /api/classes/{name} — преименувай { newName }
    [HttpPut("{name}")]
    public IActionResult RenameClass(string name, [FromBody] RenameClassRequest request)
    {
        try
        {
            _directory.RenameClass(name, request.NewName);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // DELETE /api/classes/{name}
    [HttpDelete("{name}")]
    public IActionResult DeleteClass(string name)
    {
        try
        {
            _directory.DeleteClass(name);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // POST /api/classes/{name}/students — нов ученик { email, fullName }
    [HttpPost("{name}/students")]
    public IActionResult AddStudent(string name, [FromBody] AddStudentRequest request)
    {
        try
        {
            _directory.AddStudent(name, request.Email, request.FullName);
            return StatusCode(StatusCodes.Status201Created, new { email = request.Email });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // PUT /api/classes/{name}/students/{email} — редактира ученик
    [HttpPut("{name}/students/{email}")]
    public IActionResult UpdateStudent(string name, string email, [FromBody] UpdateStudentRequest request)
    {
        try
        {
            _directory.UpdateStudent(name, email, request.Email, request.FullName);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // DELETE /api/classes/{name}/students/{email}
    [HttpDelete("{name}/students/{email}")]
    public IActionResult DeleteStudent(string name, string email)
    {
        try
        {
            _directory.DeleteStudent(name, email);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // POST /api/classes/{name}/students/bulk — масов импорт от CSV
    [HttpPost("{name}/students/bulk")]
    public IActionResult BulkAddStudents(string name, [FromBody] BulkAddRequest request)
    {
        try
        {
            var students = (request.Students ?? new List<StudentRecord>()).ToList();
            var added = _directory.BulkAddStudents(name, students);
            return Ok(new { added, total = students.Count });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}

// DTOs
public record CreateClassRequest(string Name);
public record RenameClassRequest(string NewName);
public record AddStudentRequest(string Email, string FullName);
public record UpdateStudentRequest(string Email, string FullName);
public record BulkAddRequest(List<StudentRecord> Students);
