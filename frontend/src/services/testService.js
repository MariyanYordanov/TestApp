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

// Зарежда списък с класове от students.json директорията (за dropdown)
export async function getClasses() {
    return api.get('/tests/classes', { skipAuth: true });
}

// Проверява дали имейлът на ученика е в директорията — връща { fullName, className }
// Хвърля грешка при 404 (имейлът не е намерен)
export async function resolveEmail(shareCode, email) {
    return api.post(`/tests/${shareCode}/resolve-email`, { email }, { skipAuth: true });
}

// Анулира опит — учителят позволява повторно решаване
export async function voidAttempt(testId, attemptId) {
    return api.post(`/tests/${testId}/attempts/${attemptId}/void`, {});
}

// ---------------------------------------------------------------------------
// Класове и ученици (CRUD на students.json)
// ---------------------------------------------------------------------------

export async function getAllClasses() {
    return api.get('/classes');
}

export async function createClass(name) {
    return api.post('/classes', { name });
}

export async function renameClass(oldName, newName) {
    return api.put(`/classes/${encodeURIComponent(oldName)}`, { newName });
}

export async function deleteClass(name) {
    return api.delete(`/classes/${encodeURIComponent(name)}`);
}

export async function addStudent(className, email, fullName) {
    return api.post(`/classes/${encodeURIComponent(className)}/students`, { email, fullName });
}

export async function updateStudent(className, oldEmail, newEmail, fullName) {
    return api.put(
        `/classes/${encodeURIComponent(className)}/students/${encodeURIComponent(oldEmail)}`,
        { email: newEmail, fullName }
    );
}

export async function deleteStudent(className, email) {
    return api.delete(
        `/classes/${encodeURIComponent(className)}/students/${encodeURIComponent(email)}`
    );
}

export async function bulkAddStudents(className, students) {
    return api.post(
        `/classes/${encodeURIComponent(className)}/students/bulk`,
        { students }
    );
}
