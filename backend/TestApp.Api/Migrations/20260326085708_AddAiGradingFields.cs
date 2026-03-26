using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TestApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAiGradingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AiFeedback",
                table: "AttemptAnswers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AiScore",
                table: "AttemptAnswers",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "GradedAt",
                table: "AttemptAnswers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "GradingStatus",
                table: "AttemptAnswers",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AiFeedback",
                table: "AttemptAnswers");

            migrationBuilder.DropColumn(
                name: "AiScore",
                table: "AttemptAnswers");

            migrationBuilder.DropColumn(
                name: "GradedAt",
                table: "AttemptAnswers");

            migrationBuilder.DropColumn(
                name: "GradingStatus",
                table: "AttemptAnswers");
        }
    }
}
