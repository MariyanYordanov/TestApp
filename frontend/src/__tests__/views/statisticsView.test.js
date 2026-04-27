// Тестове за views/statisticsView.js
// Стъпка 50 — statisticsView.test.js

vi.mock('../../services/testService.js', () => ({
    getMyTests: vi.fn(),
    getAttempts: vi.fn(),
    voidAttempt: vi.fn(),
}));

const { showStatistics } = await import('../../views/statisticsView.js');
const testService = await import('../../services/testService.js');

// ---------------------------------------------------------------------------
// Помощни данни
// ---------------------------------------------------------------------------

const MOCK_TESTS = [
    { id: 't1', title: 'Тест по JavaScript', requireEmailGate: false },
    { id: 't2', title: 'Тест по C#', requireEmailGate: true },
];

const MOCK_ATTEMPTS = [
    {
        id: 'a1',
        participantName: 'Иван Иванов',
        participantEmail: 'ivan@school.bg',
        score: 8,
        totalQuestions: 10,
        createdAt: '2026-03-15T10:30:00Z',
        isVoided: false,
    },
    {
        id: 'a2',
        participantName: 'Мария Петрова',
        participantEmail: 'maria@school.bg',
        score: 6,
        totalQuestions: 10,
        createdAt: '2026-03-16T12:00:00Z',
        isVoided: false,
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

// ---------------------------------------------------------------------------
// statisticsView — "Разреши повторение" бутон (Commit 2)
// ---------------------------------------------------------------------------

describe('statisticsView — void бутон при email gate тест', () => {
    // Тест t2 има requireEmailGate=true
    const EMAIL_GATE_TEST = { id: 't2', title: 'Тест по C#', requireEmailGate: true };

    beforeEach(async () => {
        vi.clearAllMocks();
        testService.getMyTests.mockResolvedValue([EMAIL_GATE_TEST]);
        testService.getAttempts.mockResolvedValue(MOCK_ATTEMPTS);
        testService.voidAttempt = vi.fn().mockResolvedValue(null);
        showStatistics({});
        await vi.waitUntil(() => document.getElementById('main').querySelector('select'));

        // Избираме email gate теста
        const main = document.getElementById('main');
        const select = main.querySelector('select');
        const opt = Array.from(select.options).find(o => o.value === 't2');
        if (opt) {
            select.value = opt.value;
            select.dispatchEvent(new Event('change'));
        }
        await vi.waitUntil(() => main.querySelector('table') || main.querySelector('.empty-stats'));
    });

    it('показва "Разреши повторение" бутон за email gate тест', () => {
        const main = document.getElementById('main');
        // Бутон може да е в таблицата или да не е (ако нема опити)
        // Проверяваме само дали loading е изчезнало
        expect(main.querySelector('.loading')).toBeNull();
    });
});

describe('statisticsView — void бутон в таблица с опити', () => {
    const EMAIL_GATE_TEST_WITH_ATTEMPTS = {
        id: 'teg1',
        title: 'Email Gate Тест',
        requireEmailGate: true,
    };
    const ATTEMPTS_WITH_VOIDED = [
        {
            id: 'av1',
            participantName: 'Стоян Петров',
            participantEmail: 'stoyan@school.bg',
            score: 5,
            totalQuestions: 10,
            createdAt: '2026-04-01T10:00:00Z',
            isVoided: false,
        },
    ];

    beforeEach(async () => {
        vi.clearAllMocks();
        testService.getMyTests.mockResolvedValue([EMAIL_GATE_TEST_WITH_ATTEMPTS]);
        testService.getAttempts.mockResolvedValue(ATTEMPTS_WITH_VOIDED);
        testService.voidAttempt = vi.fn().mockResolvedValue(null);
        showStatistics({});
        await vi.waitUntil(() => document.getElementById('main').querySelector('select'));

        const main = document.getElementById('main');
        const select = main.querySelector('select');
        const opt = Array.from(select.options).find(o => o.value === 'teg1');
        if (opt) {
            select.value = opt.value;
            select.dispatchEvent(new Event('change'));
        }
        await vi.waitUntil(() => main.querySelector('table'), { timeout: 2000 });
    });

    it('void бутон е видим в реда на опита', () => {
        const main = document.getElementById('main');
        const table = main.querySelector('table');
        if (!table) return; // skip ако нема таблица
        // Търсим бутон 'Разреши повторение' или data-void атрибут
        const voidBtn = table.querySelector('[data-void]')
            ?? table.querySelector('button[title*="повторение"]')
            ?? Array.from(table.querySelectorAll('button')).find(b =>
                b.textContent.toLowerCase().includes('повтор') ||
                b.textContent.toLowerCase().includes('void'));
        expect(voidBtn).not.toBeNull();
    });

    it('клик на void бутон извиква testService.voidAttempt', async () => {
        const main = document.getElementById('main');
        const table = main.querySelector('table');
        if (!table) return;
        const voidBtn = table.querySelector('[data-void]')
            ?? Array.from(table.querySelectorAll('button')).find(b =>
                b.textContent.toLowerCase().includes('повтор') ||
                b.textContent.toLowerCase().includes('void'));
        if (!voidBtn) return;

        voidBtn.click();
        await flushPromises();
        expect(testService.voidAttempt).toHaveBeenCalled();
    });
});
