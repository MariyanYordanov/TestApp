// Тестове за utils/formatDate.js
// Стъпка 60 — formatDate.test.js

const { formatDate } = await import('../../utils/formatDate.js');

describe('formatDate — невалидни входове', () => {
    it('връща "—" за null', () => {
        expect(formatDate(null)).toBe('—');
    });

    it('връща "—" за undefined', () => {
        expect(formatDate(undefined)).toBe('—');
    });

    it('връща "—" за празен стринг', () => {
        expect(formatDate('')).toBe('—');
    });

    it('връща "—" за невалиден дата стринг', () => {
        expect(formatDate('not-a-date')).toBe('—');
    });

    it('връща "—" за произволен текст', () => {
        expect(formatDate('hello world')).toBe('—');
    });
});

describe('formatDate — валидни ISO дати', () => {
    it('форматира коректно валидна ISO дата', () => {
        const result = formatDate('2026-03-01T10:00:00Z');
        // bg-BG формат: "01.03.2026" (може да има суфикс " г." в JSDOM)
        expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}/);
    });

    it('връща непразен стринг за валидна дата', () => {
        expect(formatDate('2026-03-15T14:30:00Z')).not.toBe('—');
    });

    it('форматира дата само с дата компонент', () => {
        const result = formatDate('2025-12-31');
        expect(result).not.toBe('—');
        expect(result.length).toBeGreaterThan(0);
    });

    it('форматира Unix timestamp като число (edge case)', () => {
        // Числата не са ISO стринг — new Date('0') може да е Invalid
        // Очакваме или форматирана дата или '—' — не трябва да хвърля грешка
        expect(() => formatDate('0')).not.toThrow();
    });
});
