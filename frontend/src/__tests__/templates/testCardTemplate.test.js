// Тестове за templates/testCardTemplate.js

import { buildTestCard, formatDate } from '../../templates/testCardTemplate.js';

const makeTest = (overrides = {}) => ({
    id: '1',
    title: 'Тест по JavaScript',
    status: 'draft',
    questionsCount: 10,
    attemptsCount: 5,
    createdAt: '2026-03-01T10:00:00Z',
    shareCode: 'JS001234',
    ...overrides,
});

describe('buildTestCard() — обща структура', () => {
    it('създава div с клас test-card', () => {
        const card = buildTestCard(makeTest());
        expect(card.tagName).toBe('DIV');
        expect(card.classList.contains('test-card')).toBe(true);
    });

    it('задава data-status атрибута', () => {
        const card = buildTestCard(makeTest({ status: 'published' }));
        expect(card.dataset.status).toBe('published');
    });

    it('рендира заглавието с textContent (без XSS)', () => {
        const maliciousTitle = '<script>alert("xss")</script>';
        const card = buildTestCard(makeTest({ title: maliciousTitle }));
        const title = card.querySelector('.test-card-title');
        expect(title.textContent).toBe(maliciousTitle);
        expect(card.innerHTML).not.toContain('<script>');
    });

    it('рендира shareCode с textContent', () => {
        const card = buildTestCard(makeTest({ shareCode: 'TEST1234' }));
        const code = card.querySelector('code');
        expect(code.textContent).toBe('TEST1234');
    });
});

describe('buildTestCard() — статус draft', () => {
    it('показва badge "Чернова"', () => {
        const card = buildTestCard(makeTest({ status: 'draft' }));
        const badge = card.querySelector('.badge');
        expect(badge.textContent).toBe('Чернова');
        expect(badge.classList.contains('badge-draft')).toBe(true);
    });

    it('съдържа бутон "Редактирай"', () => {
        const card = buildTestCard(makeTest({ status: 'draft' }));
        const links = card.querySelectorAll('a');
        const editLink = Array.from(links).find(a => a.textContent === 'Редактирай');
        expect(editLink).toBeDefined();
    });

    it('съдържа бутон "Детайли"', () => {
        const card = buildTestCard(makeTest({ status: 'draft' }));
        const links = card.querySelectorAll('a');
        const detailsLink = Array.from(links).find(a => a.textContent === 'Детайли');
        expect(detailsLink).toBeDefined();
    });
});

describe('buildTestCard() — статус published', () => {
    it('показва badge "Публикуван"', () => {
        const card = buildTestCard(makeTest({ status: 'published' }));
        const badge = card.querySelector('.badge');
        expect(badge.textContent).toBe('Публикуван');
    });

    it('съдържа бутон "Редактирай"', () => {
        const card = buildTestCard(makeTest({ status: 'published' }));
        const links = card.querySelectorAll('a');
        const editLink = Array.from(links).find(a => a.textContent === 'Редактирай');
        expect(editLink).toBeDefined();
    });
});

describe('buildTestCard() — статус archived', () => {
    it('показва badge "Архивиран"', () => {
        const card = buildTestCard(makeTest({ status: 'archived' }));
        const badge = card.querySelector('.badge');
        expect(badge.textContent).toBe('Архивиран');
    });

    it('НЕ съдържа бутон "Редактирай"', () => {
        const card = buildTestCard(makeTest({ status: 'archived' }));
        const links = card.querySelectorAll('a');
        const editLink = Array.from(links).find(a => a.textContent === 'Редактирай');
        expect(editLink).toBeUndefined();
    });

    it('съдържа бутон "Детайли"', () => {
        const card = buildTestCard(makeTest({ status: 'archived' }));
        const links = card.querySelectorAll('a');
        const detailsLink = Array.from(links).find(a => a.textContent === 'Детайли');
        expect(detailsLink).toBeDefined();
    });
});

describe('buildTestCard() — meta информация', () => {
    it('показва броя въпроси', () => {
        const card = buildTestCard(makeTest({ questionsCount: 15 }));
        const meta = card.querySelector('.test-card-meta');
        expect(meta.textContent).toContain('15 въпроса');
    });

    it('показва броя опити', () => {
        const card = buildTestCard(makeTest({ attemptsCount: 42 }));
        const meta = card.querySelector('.test-card-meta');
        expect(meta.textContent).toContain('42 опита');
    });
});

describe('formatDate()', () => {
    it('връща "—" при null', () => {
        expect(formatDate(null)).toBe('—');
    });

    it('връща "—" при undefined', () => {
        expect(formatDate(undefined)).toBe('—');
    });

    it('връща "—" при празен низ', () => {
        expect(formatDate('')).toBe('—');
    });

    it('форматира валидна ISO дата', () => {
        const result = formatDate('2026-03-01T10:00:00Z');
        // Форматът трябва да включва деня, месеца и годината
        expect(result).toMatch(/01/);
        expect(result).toMatch(/03/);
        expect(result).toMatch(/2026/);
    });

    it('връща форматирана дата с разделители', () => {
        const result = formatDate('2026-01-15T00:00:00Z');
        // Форматът bg-BG: "15.01.2026" или подобен
        expect(result).toContain('2026');
    });
});
