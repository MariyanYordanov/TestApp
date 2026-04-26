// Стъпка 39 — testService.js
// Сервизен слой за операции с тестове.
// Обвива api.js и предоставя именувани функции с ясна бизнес семантика.
//
// Публични функции:
//   getMyTests()                       — зарежда тестовете на учителя
//   createTest(state)                  — създава нов тест (state → API payload)
//   getFullTest(testId)                — зарежда пълен тест с въпроси (за учителя)
//   getPublicTest(shareCode)           — зарежда публична информация за тест (за ученика)
//   submitAttempt(shareCode, payload)  — изпраща отговорите на ученика
//   getAttempts(testId)                — зарежда опитите за конкретен тест
//   publishTest(testId)                — публикува чернова (Draft → Published)
//   updateTest(testId, state)          — обновява тест (state → API payload)
//   deleteTest(testId)                 — изтрива тест

import { api } from './api.js';

// ---------------------------------------------------------------------------
// toApiPayload — конвертира wizard state към API payload
//
// Трансформации:
//   durationMinutes (минути) → duration (секунди, minutes × 60)
//   премахва durationMinutes от payload
//
// @param {object} state — wizard state
// @returns {object} — payload готов за изпращане към backend
// ---------------------------------------------------------------------------
export function toApiPayload(state) {
    const { durationMinutes, ...rest } = state;
    return {
        ...rest,
        duration: (durationMinutes ?? 30) * 60,
    };
}

// Връща списъка с тестове на влезлия учител
export async function getMyTests() {
    return api.get('/tests');
}

// Създава нов тест и връща резултата от сървъра
// Конвертира durationMinutes → duration преди изпращане
export async function createTest(state) {
    return api.post('/tests', toApiPayload(state));
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

// Архивира тест — Draft/Published → Archived
export async function archiveTest(testId) {
    return api.put(`/tests/${testId}/archive`);
}

// Възстановява архивиран тест към Draft
export async function restoreTest(testId) {
    return api.put(`/tests/${testId}/restore`);
}

// Обновява тест по ID — използва се при edit режим
// Конвертира durationMinutes → duration преди изпращане
export async function updateTest(testId, state) {
    return api.put(`/tests/${testId}`, toApiPayload(state));
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
