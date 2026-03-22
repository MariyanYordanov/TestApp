// Тестове за views/dashboardView.js
//
// БЕЛЕЖКА: Тестовете за брой карти (3 общо, 1 draft, 1 published, 1 archived)
// зависят от MOCK_TESTS константата в dashboardView.js.
// При свързването с реален API (Седмица 6) тези тестове ще се обновят
// да мокират fetch вместо да разчитат на вградените mock данни.

import { showDashboard } from '../../views/dashboardView.js';

describe('dashboardView.js — рендиране', () => {
    beforeEach(() => {
        showDashboard();
    });

    it('рендира h1 "Моите тестове"', () => {
        const main = document.getElementById('main');
        const h1 = main.querySelector('h1');
        expect(h1).not.toBeNull();
        expect(h1.textContent).toBe('Моите тестове');
    });

    it('рендира 4 filter бутона', () => {
        const main = document.getElementById('main');
        const filterBtns = main.querySelectorAll('.filter-btn');
        expect(filterBtns.length).toBe(4);
    });

    it('рендира 3 test карти (mock данните)', () => {
        const main = document.getElementById('main');
        const cards = main.querySelectorAll('.test-card');
        expect(cards.length).toBe(3);
    });

    it('показва бутон "+ Нов тест"', () => {
        const main = document.getElementById('main');
        const btn = main.querySelector('a[href="/tests/create"]');
        expect(btn).not.toBeNull();
        expect(btn.textContent).toBe('+ Нов тест');
    });

    it('filter-btn "Всички" е активен по подразбиране', () => {
        const main = document.getElementById('main');
        const allBtn = Array.from(main.querySelectorAll('.filter-btn'))
            .find(b => b.dataset.filter === 'all');
        expect(allBtn.classList.contains('active')).toBe(true);
    });
});

describe('dashboardView.js — филтриране', () => {
    beforeEach(() => {
        // Зануляваме activeFilter чрез ново зареждане
        showDashboard();
    });

    it('Click "Чернови" → показва 1 карта (draft)', () => {
        const main = document.getElementById('main');
        const draftBtn = Array.from(main.querySelectorAll('.filter-btn'))
            .find(b => b.dataset.filter === 'draft');
        draftBtn.click();

        const cards = main.querySelectorAll('.test-card');
        expect(cards.length).toBe(1);
        expect(cards[0].dataset.status).toBe('draft');
    });

    it('Click "Публикувани" → показва 1 карта (published)', () => {
        const main = document.getElementById('main');
        const publishedBtn = Array.from(main.querySelectorAll('.filter-btn'))
            .find(b => b.dataset.filter === 'published');
        publishedBtn.click();

        const cards = main.querySelectorAll('.test-card');
        expect(cards.length).toBe(1);
        expect(cards[0].dataset.status).toBe('published');
    });

    it('Click "Архивирани" → показва 1 карта (archived)', () => {
        const main = document.getElementById('main');
        const archivedBtn = Array.from(main.querySelectorAll('.filter-btn'))
            .find(b => b.dataset.filter === 'archived');
        archivedBtn.click();

        const cards = main.querySelectorAll('.test-card');
        expect(cards.length).toBe(1);
        expect(cards[0].dataset.status).toBe('archived');
    });

    it('Click "Всички" → показва 3 карти', () => {
        const main = document.getElementById('main');

        // Първо филтрираме
        const draftBtn = Array.from(main.querySelectorAll('.filter-btn'))
            .find(b => b.dataset.filter === 'draft');
        draftBtn.click();

        // После обратно на Всички
        const allBtn = Array.from(main.querySelectorAll('.filter-btn'))
            .find(b => b.dataset.filter === 'all');
        allBtn.click();

        const cards = main.querySelectorAll('.test-card');
        expect(cards.length).toBe(3);
    });

    it('активният filter-btn се обновява при клик', () => {
        showDashboard();
        const main = document.getElementById('main');

        const draftBtn = Array.from(main.querySelectorAll('.filter-btn'))
            .find(b => b.dataset.filter === 'draft');
        draftBtn.click();

        expect(draftBtn.classList.contains('active')).toBe(true);

        const allBtn = Array.from(main.querySelectorAll('.filter-btn'))
            .find(b => b.dataset.filter === 'all');
        expect(allBtn.classList.contains('active')).toBe(false);
    });
});
