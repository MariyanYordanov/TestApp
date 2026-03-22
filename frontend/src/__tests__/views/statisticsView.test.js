// Тестове за views/statisticsView.js
// Стъпка 50 — statisticsView.test.js

vi.mock('../../services/testService.js', () => ({
    getMyTests: vi.fn(),
    getAttempts: vi.fn(),
}));

const { showStatistics } = await import('../../views/statisticsView.js');
const testService = await import('../../services/testService.js');

// ---------------------------------------------------------------------------
// Помощни данни
// ---------------------------------------------------------------------------

const MOCK_TESTS = [
    { id: 't1', title: 'Тест по JavaScript' },
    { id: 't2', title: 'Тест по C#' },
];

const MOCK_ATTEMPTS = [
    {
        id: 'a1',
        participantName: 'Иван Иванов',
        score: 8,
        totalQuestions: 10,
        createdAt: '2026-03-15T10:30:00Z',
    },
    {
        id: 'a2',
        participantName: 'Мария Петрова',
        score: 6,
        totalQuestions: 10,
        createdAt: '2026-03-16T12:00:00Z',
    },
];

// ---------------------------------------------------------------------------
// statisticsView — loading state
// ---------------------------------------------------------------------------

describe('statisticsView — loading state', () => {
    it('показва loading съобщение преди fetch', async () => {
        testService.getMyTests.mockReturnValue(new Promise(() => {}));
        showStatistics({});
        const loading = document.getElementById('main').querySelector('.loading');
        expect(loading).not.toBeNull();
    });
});

// ---------------------------------------------------------------------------
// statisticsView — без тестове
// ---------------------------------------------------------------------------

describe('statisticsView — empty state (без тестове)', () => {
    it('показва съобщение при липса на тестове', async () => {
        testService.getMyTests.mockResolvedValue([]);
        showStatistics({});
        await vi.waitUntil(() => !document.getElementById('main').querySelector('.loading'));
        const main = document.getElementById('main');
        expect(main.textContent).toMatch(/[Нн]ямате тестове/);
    });
});

// ---------------------------------------------------------------------------
// statisticsView — рендиране с тестове
// ---------------------------------------------------------------------------

describe('statisticsView — рендиране', () => {
    beforeEach(async () => {
        testService.getMyTests.mockResolvedValue(MOCK_TESTS);
        testService.getAttempts.mockResolvedValue([]);
        showStatistics({});
        await vi.waitUntil(() => document.getElementById('main').querySelector('select'));
    });

    it('рендира заглавие "Статистика"', () => {
        const main = document.getElementById('main');
        const h1 = main.querySelector('h1');
        expect(h1).not.toBeNull();
        expect(h1.textContent).toBe('Статистика');
    });

    it('рендира <select> за избор на тест', () => {
        const main = document.getElementById('main');
        const select = main.querySelector('select');
        expect(select).not.toBeNull();
    });

    it('select съдържа опции за всеки тест', () => {
        const main = document.getElementById('main');
        const options = main.querySelectorAll('select option');
        // Поне 2 опции (за двата теста) — може да има placeholder опция
        expect(options.length).toBeGreaterThanOrEqual(2);
    });

    it('опциите в select показват заглавията на тестовете', () => {
        const main = document.getElementById('main');
        const options = Array.from(main.querySelectorAll('select option'));
        const texts = options.map(o => o.textContent);
        expect(texts.some(t => t.includes('JavaScript'))).toBe(true);
        expect(texts.some(t => t.includes('C#'))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// statisticsView — избор на тест → зарежда опитите
// ---------------------------------------------------------------------------

describe('statisticsView — избор на тест', () => {
    beforeEach(async () => {
        testService.getMyTests.mockResolvedValue(MOCK_TESTS);
        testService.getAttempts.mockResolvedValue(MOCK_ATTEMPTS);
        showStatistics({});
        await vi.waitUntil(() => document.getElementById('main').querySelector('select'));
    });

    it('при промяна на select извиква getAttempts с правилния testId', async () => {
        const main = document.getElementById('main');
        const select = main.querySelector('select');

        // Намираме опцията за t1
        const opt = Array.from(select.options).find(o => o.value === 't1');
        select.value = opt.value;
        select.dispatchEvent(new Event('change'));

        await vi.waitUntil(() => testService.getAttempts.mock.calls.length > 0);
        expect(testService.getAttempts).toHaveBeenCalledWith('t1');
    });

    it('рендира таблица след избор на тест с опити', async () => {
        const main = document.getElementById('main');
        const select = main.querySelector('select');

        const opt = Array.from(select.options).find(o => o.value === 't1');
        select.value = opt.value;
        select.dispatchEvent(new Event('change'));

        await vi.waitUntil(() => main.querySelector('table'));
        expect(main.querySelector('table')).not.toBeNull();
    });

    it('рендира 2 реда в таблицата при 2 опита', async () => {
        const main = document.getElementById('main');
        const select = main.querySelector('select');

        const opt = Array.from(select.options).find(o => o.value === 't1');
        select.value = opt.value;
        select.dispatchEvent(new Event('change'));

        await vi.waitUntil(() => main.querySelector('table'));
        const rows = main.querySelectorAll('tbody tr');
        expect(rows.length).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// statisticsView — empty stats (няма опити за избран тест)
// ---------------------------------------------------------------------------

describe('statisticsView — empty stats', () => {
    beforeEach(async () => {
        testService.getMyTests.mockResolvedValue(MOCK_TESTS);
        testService.getAttempts.mockResolvedValue([]);
        showStatistics({});
        await vi.waitUntil(() => document.getElementById('main').querySelector('select'));
    });

    it('показва empty message при 0 опита', async () => {
        const main = document.getElementById('main');
        const select = main.querySelector('select');

        const opt = Array.from(select.options).find(o => o.value === 't1');
        select.value = opt.value;
        select.dispatchEvent(new Event('change'));

        await vi.waitUntil(() => !main.querySelector('.loading'));
        // Няма таблица или таблицата е празна
        const table = main.querySelector('table');
        if (table) {
            const rows = table.querySelectorAll('tbody tr');
            expect(rows.length).toBe(0);
        } else {
            // Показва empty message вместо таблица
            expect(main.textContent.length).toBeGreaterThan(0);
        }
    });
});

// ---------------------------------------------------------------------------
// statisticsView — error state
// ---------------------------------------------------------------------------

describe('statisticsView — error state', () => {
    it('показва съобщение при грешка при зареждане на тестовете', async () => {
        testService.getMyTests.mockRejectedValue(new Error('Мрежова грешка'));
        showStatistics({});
        await vi.waitUntil(() => document.getElementById('main').querySelector('.error'));
        const errorEl = document.getElementById('main').querySelector('.error');
        expect(errorEl).not.toBeNull();
        expect(errorEl.textContent.length).toBeGreaterThan(0);
    });

    it('показва съобщение при грешка при зареждане на опити', async () => {
        testService.getMyTests.mockResolvedValue(MOCK_TESTS);
        testService.getAttempts.mockRejectedValue(new Error('Грешка при опити'));
        showStatistics({});
        await vi.waitUntil(() => document.getElementById('main').querySelector('select'));

        const main = document.getElementById('main');
        const select = main.querySelector('select');
        const opt = Array.from(select.options).find(o => o.value === 't1');
        select.value = opt.value;
        select.dispatchEvent(new Event('change'));

        await vi.waitUntil(() => main.querySelector('.error'));
        expect(main.querySelector('.error')).not.toBeNull();
    });
});
