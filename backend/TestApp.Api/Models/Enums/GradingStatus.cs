namespace TestApp.Api.Models.Enums;

public enum GradingStatus
{
    NotApplicable = 0,  // За Closed/Multi въпроси
    Pending       = 1,  // Open/Code — изчаква AI проверка
    Graded        = 2,  // AI е оценил
    Failed        = 3,  // AI грешка при оценяване
}
