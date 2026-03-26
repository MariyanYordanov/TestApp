using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TestApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSampleAnswerToQuestion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SampleAnswer",
                table: "Questions",
                type: "TEXT",
                maxLength: 50000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SampleAnswer",
                table: "Questions");
        }
    }
}
