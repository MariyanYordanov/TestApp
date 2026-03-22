// Тестове за templates/statsTableTemplate.js
// Стъпка 49 — statsTableTemplate.test.js

import {
    buildStatsRow,
    buildStatsTable,
    buildEmptyStatsMessage,
} from '../../templates/statsTableTemplate.js';

// ---------------------------------------------------------------------------
// Помощни данни
// ---------------------------------------------------------------------------

const makeAttempt = (overrides = {}) => ({
    id: 'a1',
    participantName: 'Иван Иванов',
    score: 8,
    totalQuestions: 10,
    createdAt: '2026-03-15T10:30:00Z',
    ...overrides,
});

// ---------------------------------------------------------------------------
// buildStatsRow()
// ---------------------------------------------------------------------------

describe('buildStatsRow() — структура', () => {
    it('създава <tr> елемент', () => {
        const row = buildStatsRow(makeAttempt());
        expect(row.tagName).toBe('TR');
    });

    it('съдържа 4 клетки <td>', () => {
        const row = buildStatsRow(makeAttempt());
        const cells = row.querySelectorAll('td');
        expect(cells.length).toBe(4);
    });

    it('показва participantName с textContent (защита от XSS)', () => {
        const maliciousName = '<script>alert("xss")</script>';
        const row = buildStatsRow(makeAttempt({ participantName: maliciousName }));
        const cells = row.querySelectorAll('td');
        expect(cells[0].textContent).toBe(maliciousName);
        expect(row.innerHTML).not.toContain('<script>');
    });

    it('показва резултата като "score/totalQuestions"', () => {
        const row = buildStatsRow(makeAttempt({ score: 7, totalQuestions: 10 }));
        const cells = row.querySelectorAll('td');
        expect(cells[1].textContent).toContain('7');
        expect(cells[1].textContent).toContain('10');
    });

    it('показва процента с % знак', () => {
        const row = buildStatsRow(makeAttempt({ score: 8, totalQuestions: 10 }));
        const cells = row.querySelectorAll('td');
        expect(cells[2].textContent).toContain('%');
    });

    it('изчислява 80% при score=8, totalQuestions=10', () => {
        const row = buildStatsRow(makeAttempt({ score: 8, totalQuestions: 10 }));
        const cells = row.querySelectorAll('td');
        expect(cells[2].textContent).toContain('80');
    });

    it('изчислява 100% при score=10, totalQuestions=10', () => {
        const row = buildStatsRow(makeAttempt({ score: 10, totalQuestions: 10 }));
        const cells = row.querySelectorAll('td');
        expect(cells[2].textContent).toContain('100');
    });

    it('показва 0% при score=0', () => {
        const row = buildStatsRow(makeAttempt({ score: 0, totalQuestions: 10 }));
        const cells = row.querySelectorAll('td');
        expect(cells[2].textContent).toContain('0');
    });

    it('показва форматирана дата в 4-тата клетка', () => {
        const row = buildStatsRow(makeAttempt({ createdAt: '2026-03-15T10:30:00Z' }));
        const cells = row.querySelectorAll('td');
        expect(cells[3].textContent).toContain('2026');
    });

    it('показва "—" при невалидна дата', () => {
        const row = buildStatsRow(makeAttempt({ createdAt: null }));
        const cells = row.querySelectorAll('td');
        expect(cells[3].textContent).toBe('—');
    });
});

describe('buildStatsRow() — гранични случаи', () => {
    it('работи при totalQuestions = 0 (без деление на нула)', () => {
        expect(() => buildStatsRow(makeAttempt({ score: 0, totalQuestions: 0 }))).not.toThrow();
    });

    it('при totalQuestions = 0 показва 0%', () => {
        const row = buildStatsRow(makeAttempt({ score: 0, totalQuestions: 0 }));
        const cells = row.querySelectorAll('td');
        expect(cells[2].textContent).toContain('0');
    });
});

// ---------------------------------------------------------------------------
// buildStatsTable()
// ---------------------------------------------------------------------------

describe('buildStatsTable() — структура', () => {
    it('създава <table> елемент', () => {
        const table = buildStatsTable([]);
        expect(table.tagName).toBe('TABLE');
    });

    it('съдържа <thead> с 4 заглавия', () => {
        const table = buildStatsTable([]);
        const headers = table.querySelectorAll('thead th');
        expect(headers.length).toBe(4);
    });

    it('заглавията включват "Участник"', () => {
        const table = buildStatsTable([]);
        const headers = table.querySelectorAll('thead th');
        const texts = Array.from(headers).map(h => h.textContent);
        expect(texts.some(t => t.includes('Участник'))).toBe(true);
    });

    it('заглавията включват "Резултат"', () => {
        const table = buildStatsTable([]);
        const headers = table.querySelectorAll('thead th');
        const texts = Array.from(headers).map(h => h.textContent);
        expect(texts.some(t => t.includes('Резултат'))).toBe(true);
    });

    it('заглавията включват "Процент"', () => {
        const table = buildStatsTable([]);
        const headers = table.querySelectorAll('thead th');
        const texts = Array.from(headers).map(h => h.textContent);
        expect(texts.some(t => t.includes('Процент'))).toBe(true);
    });

    it('заглавията включват "Дата"', () => {
        const table = buildStatsTable([]);
        const headers = table.querySelectorAll('thead th');
        const texts = Array.from(headers).map(h => h.textContent);
        expect(texts.some(t => t.includes('Дата'))).toBe(true);
    });

    it('съдържа <tbody>', () => {
        const table = buildStatsTable([]);
        const tbody = table.querySelector('tbody');
        expect(tbody).not.toBeNull();
    });

    it('рендира 0 реда при празен масив', () => {
        const table = buildStatsTable([]);
        const rows = table.querySelectorAll('tbody tr');
        expect(rows.length).toBe(0);
    });

    it('рендира 1 ред при 1 опит', () => {
        const table = buildStatsTable([makeAttempt()]);
        const rows = table.querySelectorAll('tbody tr');
        expect(rows.length).toBe(1);
    });

    it('рендира 3 реда при 3 опита', () => {
        const attempts = [
            makeAttempt({ id: '1' }),
            makeAttempt({ id: '2', participantName: 'Мария Иванова' }),
            makeAttempt({ id: '3', participantName: 'Петър Петров' }),
        ];
        const table = buildStatsTable(attempts);
        const rows = table.querySelectorAll('tbody tr');
        expect(rows.length).toBe(3);
    });

    it('не мутира оригиналния масив', () => {
        const attempts = [makeAttempt()];
        const original = [...attempts];
        buildStatsTable(attempts);
        expect(attempts).toEqual(original);
    });
});

// ---------------------------------------------------------------------------
// buildEmptyStatsMessage()
// ---------------------------------------------------------------------------

describe('buildEmptyStatsMessage()', () => {
    it('създава DOM елемент', () => {
        const el = buildEmptyStatsMessage();
        expect(el instanceof HTMLElement).toBe(true);
    });

    it('показва съобщение за липса на опити', () => {
        const el = buildEmptyStatsMessage();
        expect(el.textContent.length).toBeGreaterThan(0);
    });

    it('съдържа текст на български', () => {
        const el = buildEmptyStatsMessage();
        // Трябва да съдържа кирилица или смислено съобщение
        expect(el.textContent).toMatch(/[а-яА-Я]/);
    });
});
