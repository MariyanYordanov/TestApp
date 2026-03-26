// Стъпка 39 — testService.js
// Сервизен слой за операции с тестове.
// Обвива api.js и предоставя именувани функции с ясна бизнес семантика.
//
// Публични функции:
//   getMyTests()                       — зарежда тестовете на учителя
//   createTest(testData)               — създава нов тест
//   getFullTest(testId)                — зарежда пълен тест с въпроси (за учителя)
//   getPublicTest(shareCode)           — зарежда публична информация за тест (за ученика)
//   submitAttempt(shareCode, payload)  — изпраща отговорите на ученика
//   getAttempts(testId)                — зарежда опитите за конкретен тест
//   publishTest(testId)                — публикува чернова (Draft → Published)
//   deleteTest(testId)                 — изтрива тест

import { api } from './api.js';

// Връща списъка с тестове на влезлия учител
export async function getMyTests() {
    return api.get('/tests');
}

// Създава нов тест и връща резултата от сървъра
export async function createTest(testData) {
    return api.post('/tests', testData);
}

// Зарежда пълния тест (включително въпроси и отговори) по ID
export async function getFullTest(testId) {
    return api.get(`/tests/${testId}`);
}

// Зарежда публичната информация за тест по shareCode — БЕЗ JWT
// Използва се от ученика, който НЕ е регистриран
export async function getPublicTest(shareCode) {
    return api.get(`/tests/${shareCode}`, { skipAuth: true });
}

// Изпраща отговорите на ученика и приключва опита — БЕЗ JWT
// payload: { participantName, answers[] }
export async function submitAttempt(shareCode, payload) {
    return api.post(`/tests/${shareCode}/attempts`, payload, { skipAuth: true });
}

// Зарежда всички опити (резултати на участниците) за конкретен тест
export async function getAttempts(testId) {
    return api.get(`/tests/${testId}/attempts`);
}

// Публикува тест — сменя статуса от Draft на Published
export async function publishTest(testId) {
    return api.put(`/tests/${testId}/publish`);
}

// Обновява тест по ID — използва се при edit режим
export async function updateTest(testId, testData) {
    return api.put(`/tests/${testId}`, testData);
}

// Изтрива тест по ID — връща null при успех
export async function deleteTest(testId) {
    return api.delete(`/tests/${testId}`);
}

// Взима детайлите на един опит (учителят вижда въпроси + отговори на ученика)
export async function getAttemptDetail(testId, attemptId) {
    return api.get(`/tests/${testId}/attempts/${attemptId}`);
}

// Стартира AI оценяване на открит опит
export async function gradeAttempt(testId, attemptId) {
    return api.post(`/tests/${testId}/attempts/${attemptId}/grade`, {});
}
