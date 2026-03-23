// Тестове за views/testDetailsView.js
// Стъпка 59 — testDetailsView.test.js

vi.mock('../../services/testService.js', () => ({
    getFullTest: vi.fn(),
    getAttempts: vi.fn(),
    publishTest: vi.fn(),
}));

vi.mock('../../utils/notification.js', () => ({
    showToast: vi.fn(),
}));

const { showTestDetails } = await import('../../views/testDetailsView.js');
const testService = await import('../../services/testService.js');
const { showToast } = await import('../../utils/notification.js');

// ---------------------------------------------------------------------------
// Помощни данни
// ---------------------------------------------------------------------------

const MOCK_TEST_DRAFT = {
    id: 'test-001',
    title: 'Тест по математика',
    description: 'Основни операции',
    shareCode: 'MATH1234',
    status: 'Draft',
    duration: 30,
    createdAt: '2026-03-01T10:00:00Z',
    questions: [
        { id: 'q1', text: 'Колко е 2+2?', orderIndex: 1, answers: [] },
        { id: 'q2', text: 'Колко е 3*3?', orderIndex: 2, answers: [] },
        { id: 'q3', text: 'Колко е 10/2?', orderIndex: 3, answers: [] },
    ],
};

const MOCK_TEST_PUBLISHED = {
    id: 'test-002',
    title: 'Тест по физика',
    description: 'Механика',
    shareCode: 'PHYS5678',
    status: 'Published',
    duration: null,
    createdAt: '2026-03-10T12:00:00Z',
    questions: [
        { id: 'q4', text: 'Какво е Нютонов закон?', orderIndex: 1, answers: [] },
    ],
};

const MOCK_ATTEMPTS = [
    { id: 'a1', participantName: 'Иван Иванов', score: 8, createdAt: '2026-03-15T10:00:00Z' },
    { id: 'a2', participantName: 'Мария Петрова', score: 6, createdAt: '2026-03-16T11:00:00Z' },
];

// ---------------------------------------------------------------------------
// testDetailsView — loading state
// ---------------------------------------------------------------------------

describe('testDetailsView — loading state', () => {
    it('показва loading съобщение преди fetch', async () => {
        testService.getFullTest.mockReturnValue(new Promise(() => {}));
        showTestDetails({ params: { id: 'test-001' } });
        const loading = document.getElementById('main').querySelector('.loading');
        expect(loading).not.toBeNull();
    });
});

// ---------------------------------------------------------------------------
// testDetailsView — рендиране на Draft тест
// ---------------------------------------------------------------------------

describe('testDetailsView — рендиране (Draft)', () => {
    beforeEach(async () => {
        testService.getFullTest.mockResolvedValue(MOCK_TEST_DRAFT);
        testService.getAttempts.mockResolvedValue([]);
        showTestDetails({ params: { id: 'test-001' } });
        await vi.waitUntil(() => document.getElementById('main').querySelector('h1'));
    });

    it('рендира заглавието на теста', () => {
        const main = document.getElementById('main');
        const h1 = main.querySelector('h1');
        expect(h1).not.toBeNull();
        expect(h1.textContent).toBe('Тест по математика');
    });

    it('рендира статус badge', () => {
        const main = document.getElementById('main');
        const badge = main.querySelector('.badge');
        expect(badge).not.toBeNull();
    });

    it('рендира бутон "Редактирай" с правилния href', () => {
        const main = document.getElementById('main');
        const editLink = main.querySelector('a[href="/tests/test-001/edit"]');
        expect(editLink).not.toBeNull();
        expect(editLink.textContent).toMatch(/[Рр]едактирай/);
    });

    it('показва share кода на теста', () => {
        const main = document.getElementById('main');
        expect(main.textContent).toContain('MATH1234');
    });

    it('показва брой въпроси', () => {
        const main = document.getElementById('main');
        expect(main.textContent).toContain('3');
    });

    it('рендира бутон "Публикувай" за Draft тест', () => {
        const main = document.getElementById('main');
        const publishBtn = Array.from(main.querySelectorAll('button'))
            .find(b => b.textContent.includes('Публикувай'));
        expect(publishBtn).not.toBeNull();
    });

    it('рендира линк "Назад" към /dashboard', () => {
        const main = document.getElementById('main');
        const backLink = main.querySelector('a[href="/dashboard"]');
        expect(backLink).not.toBeNull();
    });
});

// ---------------------------------------------------------------------------
// testDetailsView — рендиране на Published тест
// ---------------------------------------------------------------------------

describe('testDetailsView — рендиране (Published)', () => {
    beforeEach(async () => {
        testService.getFullTest.mockResolvedValue(MOCK_TEST_PUBLISHED);
        testService.getAttempts.mockResolvedValue(MOCK_ATTEMPTS);
        showTestDetails({ params: { id: 'test-002' } });
        await vi.waitUntil(() => document.getElementById('main').querySelector('h1'));
    });

    it('НЕ рендира бутон "Публикувай" за Published тест', () => {
        const main = document.getElementById('main');
        const publishBtn = Array.from(main.querySelectorAll('button'))
            .find(b => b.textContent.includes('Публикувай'));
        expect(publishBtn).toBeUndefined();
    });

    it('показва брой опити от участници', async () => {
        const main = document.getElementById('main');
        // Изчакваме да се заредят опитите
        await vi.waitUntil(() => main.textContent.includes('2'));
        expect(main.textContent).toContain('2');
    });
});

// ---------------------------------------------------------------------------
// testDetailsView — публикуване на тест
// ---------------------------------------------------------------------------

describe('testDetailsView — публикуване', () => {
    beforeEach(async () => {
        testService.getFullTest.mockResolvedValue({ ...MOCK_TEST_DRAFT });
        testService.getAttempts.mockResolvedValue([]);
        testService.publishTest.mockResolvedValue({ ...MOCK_TEST_DRAFT, status: 'Published' });
        showTestDetails({ params: { id: 'test-001' } });
        await vi.waitUntil(() => document.getElementById('main').querySelector('button'));
    });

    it('"Публикувай" бутон извиква testService.publishTest с правилния id', async () => {
        const main = document.getElementById('main');
        const publishBtn = Array.from(main.querySelectorAll('button'))
            .find(b => b.textContent.includes('Публикувай'));

        // При успех, getFullTest ще бъде извикан пак за refresh
        testService.getFullTest.mockResolvedValue({ ...MOCK_TEST_DRAFT, status: 'Published' });

        publishBtn.click();
        await vi.waitUntil(() => testService.publishTest.mock.calls.length > 0);
        expect(testService.publishTest).toHaveBeenCalledWith('test-001');
    });

    it('"Публикувай" показва toast при успех', async () => {
        const main = document.getElementById('main');
        const publishBtn = Array.from(main.querySelectorAll('button'))
            .find(b => b.textContent.includes('Публикувай'));

        testService.getFullTest.mockResolvedValue({ ...MOCK_TEST_DRAFT, status: 'Published' });

        publishBtn.click();
        await vi.waitUntil(() => showToast.mock.calls.length > 0);
        expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/публикуван/i), 'success');
    });

    it('"Публикувай" презарежда view при успех', async () => {
        const main = document.getElementById('main');
        const publishBtn = Array.from(main.querySelectorAll('button'))
            .find(b => b.textContent.includes('Публикувай'));

        testService.getFullTest.mockResolvedValue({ ...MOCK_TEST_DRAFT, status: 'Published' });

        const callsBefore = testService.getFullTest.mock.calls.length;
        publishBtn.click();
        await vi.waitUntil(() => testService.getFullTest.mock.calls.length > callsBefore);
        expect(testService.getFullTest.mock.calls.length).toBeGreaterThan(callsBefore);
    });
});

// ---------------------------------------------------------------------------
// testDetailsView — копиране на линк
// ---------------------------------------------------------------------------

describe('testDetailsView — копиране на линк', () => {
    beforeEach(async () => {
        // Мокираме navigator.clipboard
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: vi.fn().mockResolvedValue(undefined) },
            writable: true,
        });

        testService.getFullTest.mockResolvedValue(MOCK_TEST_DRAFT);
        testService.getAttempts.mockResolvedValue([]);
        showTestDetails({ params: { id: 'test-001' } });
        await vi.waitUntil(() => document.getElementById('main').querySelector('h1'));
    });

    it('"Копирай линк" бутон извиква navigator.clipboard.writeText', async () => {
        const main = document.getElementById('main');
        const copyBtn = Array.from(main.querySelectorAll('button'))
            .find(b => b.textContent.includes('Копирай'));

        expect(copyBtn).not.toBeNull();
        copyBtn.click();

        await vi.waitUntil(() => navigator.clipboard.writeText.mock.calls.length > 0);
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('"Копирай линк" копира правилния URL', async () => {
        const main = document.getElementById('main');
        const copyBtn = Array.from(main.querySelectorAll('button'))
            .find(b => b.textContent.includes('Копирай'));

        copyBtn.click();

        await vi.waitUntil(() => navigator.clipboard.writeText.mock.calls.length > 0);
        const calledUrl = navigator.clipboard.writeText.mock.calls[0][0];
        expect(calledUrl).toContain('MATH1234');
    });
});

// ---------------------------------------------------------------------------
// testDetailsView — not found state
// ---------------------------------------------------------------------------

describe('testDetailsView — not found', () => {
    it('показва съобщение "Тестът не е намерен" при null отговор', async () => {
        testService.getFullTest.mockResolvedValue(null);
        showTestDetails({ params: { id: 'nonexistent' } });
        await vi.waitUntil(() => !document.getElementById('main').querySelector('.loading'));
        const main = document.getElementById('main');
        expect(main.textContent).toContain('намерен');
    });

    it('показва линк обратно към dashboard при not found', async () => {
        testService.getFullTest.mockResolvedValue(null);
        showTestDetails({ params: { id: 'nonexistent' } });
        await vi.waitUntil(() => !document.getElementById('main').querySelector('.loading'));
        const main = document.getElementById('main');
        const backLink = main.querySelector('a[href="/dashboard"]');
        expect(backLink).not.toBeNull();
    });
});

// ---------------------------------------------------------------------------
// testDetailsView — error state
// ---------------------------------------------------------------------------

describe('testDetailsView — error state', () => {
    it('показва съобщение при грешка при fetch', async () => {
        testService.getFullTest.mockRejectedValue(new Error('Мрежова грешка'));
        showTestDetails({ params: { id: 'test-001' } });
        await vi.waitUntil(() => document.getElementById('main').querySelector('.error'));
        const main = document.getElementById('main');
        const errorEl = main.querySelector('.error');
        expect(errorEl).not.toBeNull();
        expect(errorEl.textContent.length).toBeGreaterThan(0);
    });
});
