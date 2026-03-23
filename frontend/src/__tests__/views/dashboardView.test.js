// Тестове за views/dashboardView.js
// Стъпка 41 — dashboardView.test.js
// Обновени тестове: мокираме testService.getMyTests вместо вградени mock данни.

vi.mock('../../services/testService.js', () => ({
    getMyTests: vi.fn(),
}));

const { showDashboard } = await import('../../views/dashboardView.js');
const testService = await import('../../services/testService.js');

// ---------------------------------------------------------------------------
// Помощни данни
// ---------------------------------------------------------------------------
const MOCK_TESTS = [
    {
        id: '1',
        title: 'Тест по JavaScript — масиви и функции',
        status: 'published',
        questionsCount: 10,
        attemptsCount: 23,
        createdAt: '2026-03-01T10:00:00Z',
        shareCode: 'JS001234',
    },
    {
        id: '2',
        title: 'Тест по C# — класове и наследяване',
        status: 'draft',
        questionsCount: 8,
        attemptsCount: 0,
        createdAt: '2026-03-15T14:30:00Z',
        shareCode: 'CS005678',
    },
    {
        id: '3',
        title: 'Тест по математика — функции',
        status: 'archived',
        questionsCount: 15,
        attemptsCount: 45,
        createdAt: '2026-02-10T09:00:00Z',
        shareCode: 'MT009012',
    },
];

// ---------------------------------------------------------------------------
// dashboardView — loading state
// ---------------------------------------------------------------------------

describe('dashboardView — loading state', () => {
    it('показва loading съобщение преди fetch', async () => {
        // getMyTests никога не resolve-ва в този тест
        testService.getMyTests.mockReturnValue(new Promise(() => {}));
        const main = document.getElementById('main');
        showDashboard();
        // Веднага след извикване трябва да има loading елемент
        const loading = main.querySelector('.loading');
        expect(loading).not.toBeNull();
    });
});

// ---------------------------------------------------------------------------
// dashboardView — рендиране с реални данни
// ---------------------------------------------------------------------------

describe('dashboardView — рендиране', () => {
    beforeEach(async () => {
        testService.getMyTests.mockResolvedValue(MOCK_TESTS);
        showDashboard();
        await vi.waitUntil(() => document.getElementById('main').querySelector('.test-grid'));
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

    it('рендира 3 test карти', () => {
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

// ---------------------------------------------------------------------------
// dashboardView — error state
// ---------------------------------------------------------------------------

describe('dashboardView — error state', () => {
    it('показва съобщение за грешка при неуспешен fetch', async () => {
        testService.getMyTests.mockRejectedValue(new Error('Мрежова грешка'));
        showDashboard();
        await vi.waitUntil(() => document.getElementById('main').querySelector('.error'));
        const main = document.getElementById('main');
        const errorEl = main.querySelector('.error');
        expect(errorEl).not.toBeNull();
        expect(errorEl.textContent.length).toBeGreaterThan(0);
    });
});

// ---------------------------------------------------------------------------
// dashboardView — empty state
// ---------------------------------------------------------------------------

describe('dashboardView — empty state', () => {
    it('показва empty-state при празен списък', async () => {
        testService.getMyTests.mockResolvedValue([]);
        showDashboard();
        await vi.waitUntil(() => document.getElementById('main').querySelector('.test-grid'));
        const main = document.getElementById('main');
        const empty = main.querySelector('.empty-state');
        expect(empty).not.toBeNull();
    });
});

// ---------------------------------------------------------------------------
// dashboardView — филтриране
// ---------------------------------------------------------------------------

describe('dashboardView — филтриране', () => {
    beforeEach(async () => {
        testService.getMyTests.mockResolvedValue(MOCK_TESTS);
        showDashboard();
        await vi.waitUntil(() => document.getElementById('main').querySelector('.test-grid'));
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

// ---------------------------------------------------------------------------
// dashboardView — нулиране на филтъра при ново зареждане
// ---------------------------------------------------------------------------

describe('dashboardView — нулиране на activeFilter', () => {
    it('нулира activeFilter на "all" при всяко ново зареждане', async () => {
        // Първо зареждане — смяна на филтъра
        testService.getMyTests.mockResolvedValue(MOCK_TESTS);
        showDashboard();
        await vi.waitUntil(() => document.getElementById('main').querySelector('.test-grid'));

        const main = document.getElementById('main');
        const draftBtn = Array.from(main.querySelectorAll('.filter-btn'))
            .find(b => b.dataset.filter === 'draft');
        draftBtn.click(); // activeFilter = 'draft'

        // Второ зареждане — очакваме "all" да е активен
        testService.getMyTests.mockResolvedValue(MOCK_TESTS);
        showDashboard();
        await vi.waitUntil(() => {
            const allBtn = Array.from(document.getElementById('main').querySelectorAll('.filter-btn'))
                .find(b => b.dataset.filter === 'all');
            return allBtn && allBtn.classList.contains('active');
        });

        const allBtn = Array.from(document.getElementById('main').querySelectorAll('.filter-btn'))
            .find(b => b.dataset.filter === 'all');
        expect(allBtn.classList.contains('active')).toBe(true);

        // Grid трябва да показва всички 3 теста
        const cards = document.getElementById('main').querySelectorAll('.test-card');
        expect(cards.length).toBe(3);
    });
});
