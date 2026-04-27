using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TestApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTargetClassAndEmailGate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Attempts_TestId",
                table: "Attempts");

            migrationBuilder.AddColumn<bool>(
                name: "RequireEmailGate",
                table: "Tests",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TargetClass",
                table: "Tests",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsVoided",
                table: "Attempts",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ParticipantEmail",
                table: "Attempts",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Attempts_TestId_ParticipantEmail",
                table: "Attempts",
                columns: new[] { "TestId", "ParticipantEmail" },
                unique: true,
                filter: "\"IsVoided\" = 0 AND \"ParticipantEmail\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Attempts_TestId_ParticipantEmail",
                table: "Attempts");

            migrationBuilder.DropColumn(
                name: "RequireEmailGate",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "TargetClass",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "IsVoided",
                table: "Attempts");

            migrationBuilder.DropColumn(
                name: "ParticipantEmail",
                table: "Attempts");

            migrationBuilder.CreateIndex(
                name: "IX_Attempts_TestId",
                table: "Attempts",
                column: "TestId");
        }
    }
}
