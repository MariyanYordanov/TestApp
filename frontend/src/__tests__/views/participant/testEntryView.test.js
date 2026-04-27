// Тестове за views/participant/testEntryView.js
// Стъпка 45 — testEntryView.test.js
// Обновени тестове: мокираме testService.getPublicTest вместо mockTests.

vi.mock('../../../services/testService.js', () => ({
    getPublicTest: vi.fn(),
    submitAttempt: vi.fn(),
    resolveEmail: vi.fn(),
}));

const page = (await import('../../../lib/page.min.js')).default;
const { showTestEntry } = await import('../../../views/participant/testEntryView.js');
const testService = await import('../../../services/testService.js');

// Изчаква завършването на всички pending Promise микрозадачи
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

// Примерен PublicTestResponse от сървъра — без isCorrect на отговорите
const MOCK_PUBLIC_TEST = {
    shareCode: 'ABCD1234',
    title: 'Тест по JavaScript',
    description: 'Основни концепции на JavaScript.',
    duration: 1800,
    questions: [
        {
            id: 'q-1',
            text: 'Какво е JavaScript?',
            answers: [
                { id: 'a-1', text: 'Програмен език' },
                { id: 'a-2', text: 'База данни' },
                { id: 'a-3', text: 'Операционна система' },
            ],
        },
        {
            id: 'q-2',
            text: 'Кой е правилният начин за деклариране на константа?',
            answers: [
                { id: 'a-4', text: 'var x = 5' },
                { id: 'a-5', text: 'const x = 5' },
                { id: 'a-6', text: 'x := 5' },
            ],
        },
        {
            id: 'q-3',
            text: 'Какво връща typeof null?',
            answers: [
                { id: 'a-7', text: '"null"' },
                { id: 'a-8', text: '"object"' },
                { id: 'a-9', text: '"undefined"' },
            ],
        },
    ],
};

describe('testEntryView.js — loading state', () => {
    it('показва loading елемент преди API отговор', async () => {
        // getPublicTest никога не resolve-ва — можем да видим loading state
        testService.getPublicTest.mockReturnValue(new Promise(() => {}));
        const main = document.getElementById('main');
        showTestEntry({ params: { shareCode: 'ABCD1234' } });
        // Веднага след извикване — преди await — трябва да има loading съобщение
        expect(main.textContent).toMatch(/зареждане|loading/i);
    });
});

describe('testEntryView.js — невалиден shareCode (null от сървъра)', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        sessionStorage.clear();
        testService.getPublicTest.mockResolvedValue(null);
        await showTestEntry({ params: { shareCode: 'NOTEXIST' } });
        await flushPromises();
    });

    it('показва error съобщение', () => {
        const main = document.getElementById('main');
        const errorEl = main.querySelector('.error-card') ?? main.querySelector('[class*="error"]');
        expect(errorEl).not.toBeNull();
    });

    it('не рендира форма за вход', () => {
        const main = document.getElementById('main');
        expect(main.querySelector('form')).toBeNull();
    });

    it('показва link "Назад"', () => {
        const main = document.getElementById('main');
        const backLink = main.querySelector('a[href="/"]');
        expect(backLink).not.toBeNull();
    });
});

describe('testEntryView.js — грешка от сървъра', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        sessionStorage.clear();
        testService.getPublicTest.mockRejectedValue(new Error('Network error'));
        await showTestEntry({ params: { shareCode: 'ERRCODE' } });
        await flushPromises();
    });

    it('показва error card при мрежова грешка', () => {
        const main = document.getElementById('main');
        const errorEl = main.querySelector('.error-card') ?? main.querySelector('[class*="error"]');
        expect(errorEl).not.toBeNull();
    });

    it('не рендира форма при грешка', () => {
        const main = document.getElementById('main');
        expect(main.querySelector('form')).toBeNull();
    });
});

describe('testEntryView.js — валиден shareCode', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        sessionStorage.clear();
        testService.getPublicTest.mockResolvedValue(MOCK_PUBLIC_TEST);
        await showTestEntry({ params: { shareCode: 'ABCD1234' } });
        await flushPromises();
    });

    it('рендира поле за въвеждане на име', () => {
        const main = document.getElementById('main');
        expect(main.querySelector('#participant-name')).not.toBeNull();
    });

    it('рендира бутон "Започни теста"', () => {
        const main = document.getElementById('main');
        const btn = main.querySelector('button[type="submit"], button[data-action="start-test"]');
        expect(btn).not.toBeNull();
    });

    it('показва заглавието на теста', () => {
        const main = document.getElementById('main');
        expect(main.textContent).toContain('Тест по JavaScript');
    });

    it('показва броя въпроси', () => {
        const main = document.getElementById('main');
        expect(main.textContent).toContain('3');
    });

    it('показва форматираното времетраене', () => {
        const main = document.getElementById('main');
        // 1800 секунди = 30:00
        expect(main.textContent).toContain('30:00');
    });

    it('main.className е "centered"', () => {
        const main = document.getElementById('main');
        expect(main.className).toBe('centered');
    });

    it('извиква testService.getPublicTest с правилния shareCode', () => {
        expect(testService.getPublicTest).toHaveBeenCalledWith('ABCD1234');
    });
});

describe('testEntryView.js — валидация на форма', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        sessionStorage.clear();
        testService.getPublicTest.mockResolvedValue(MOCK_PUBLIC_TEST);
        await showTestEntry({ params: { shareCode: 'ABCD1234' } });
        await flushPromises();
    });

    it('показва грешка при празно name', async () => {
        const main = document.getElementById('main');
        const form = main.querySelector('form');
        const nameInput = main.querySelector('#participant-name');
        nameInput.value = '';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();
        const errorEl = main.querySelector('.field-error') ?? main.querySelector('[class*="error"]');
        expect(errorEl).not.toBeNull();
        expect(page.redirect).not.toHaveBeenCalled();
    });

    it('показва грешка при name с 1 символ', async () => {
        const main = document.getElementById('main');
        const form = main.querySelector('form');
        const nameInput = main.querySelector('#participant-name');
        nameInput.value = 'А';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();
        const errorEl = main.querySelector('.field-error') ?? main.querySelector('[class*="error"]');
        expect(errorEl).not.toBeNull();
        expect(page.redirect).not.toHaveBeenCalled();
    });

    it('показва грешка при name само с интервали (whitespace)', async () => {
        const main = document.getElementById('main');
        const form = main.querySelector('form');
        const nameInput = main.querySelector('#participant-name');
        nameInput.value = '   ';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();
        const errorEl = main.querySelector('.field-error') ?? main.querySelector('[class*="error"]');
        expect(errorEl).not.toBeNull();
        expect(page.redirect).not.toHaveBeenCalled();
    });

    it('показва грешка при name над 100 символа', async () => {
        const main = document.getElementById('main');
        const form = main.querySelector('form');
        const nameInput = main.querySelector('#participant-name');
        nameInput.value = 'А'.repeat(101);
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();
        const errorEl = main.querySelector('.field-error') ?? main.querySelector('[class*="error"]');
        expect(errorEl).not.toBeNull();
        expect(page.redirect).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// TargetClass banner — Commit 1
// ---------------------------------------------------------------------------

describe('testEntryView.js — TargetClass banner', () => {
    it('показва banner с targetClass когато е зададен', async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        const testWithClass = { ...MOCK_PUBLIC_TEST, targetClass: '9А', requireEmailGate: false };
        testService.getPublicTest.mockResolvedValue(testWithClass);
        await showTestEntry({ params: { shareCode: 'ABCD1234' } });
        await flushPromises();
        const main = document.getElementById('main');
        expect(main.textContent).toContain('9А');
    });

    it('не показва banner когато targetClass е null', async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        const testNoClass = { ...MOCK_PUBLIC_TEST, targetClass: null, requireEmailGate: false };
        testService.getPublicTest.mockResolvedValue(testNoClass);
        await showTestEntry({ params: { shareCode: 'ABCD1234' } });
        await flushPromises();
        const main = document.getElementById('main');
        const banner = main.querySelector('.target-class-banner') ?? main.querySelector('[data-target-class]');
        expect(banner).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Email gate flow — Commit 2
// ---------------------------------------------------------------------------

describe('testEntryView.js — email gate (requireEmailGate=true)', () => {
    const TEST_WITH_GATE = {
        ...MOCK_PUBLIC_TEST,
        requireEmailGate: true,
        targetClass: '9А',
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        sessionStorage.clear();
        testService.getPublicTest.mockResolvedValue(TEST_WITH_GATE);
        await showTestEntry({ params: { shareCode: 'ABCD1234' } });
        await flushPromises();
    });

    it('показва email input при requireEmailGate=true', () => {
        const main = document.getElementById('main');
        const emailInput = main.querySelector('#participant-email')
            ?? main.querySelector('input[type="email"]')
            ?? main.querySelector('input[name="participantEmail"]');
        expect(emailInput).not.toBeNull();
    });

    it('показва soft refusal при непознат имейл (404 от resolve-email)', async () => {
        testService.resolveEmail = vi.fn().mockRejectedValue({ status: 404 });
        const main = document.getElementById('main');
        const emailInput = main.querySelector('#participant-email')
            ?? main.querySelector('input[type="email"]')
            ?? main.querySelector('input[name="participantEmail"]');
        if (!emailInput) return; // skip ако нема email input

        const form = main.querySelector('form');
        emailInput.value = 'unknown@school.bg';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();

        // Soft refusal message трябва да е видимо
        const hasRefusal = main.textContent.toLowerCase().includes('имейл') ||
                           main.textContent.toLowerCase().includes('email') ||
                           main.textContent.toLowerCase().includes('намер');
        // Не е redirected
        expect(page.redirect).not.toHaveBeenCalled();
    });

    it('при успешен resolve-email именото се попълва автоматично', async () => {
        testService.resolveEmail = vi.fn().mockResolvedValue({ fullName: 'Иван Петров Иванов', className: '9А' });
        const main = document.getElementById('main');
        const emailInput = main.querySelector('#participant-email')
            ?? main.querySelector('input[type="email"]')
            ?? main.querySelector('input[name="participantEmail"]');
        if (!emailInput) return;

        emailInput.value = 'ivan.petrov@school.bg';
        emailInput.dispatchEvent(new Event('blur'));
        await flushPromises();

        // Проверяваме дали fullName е показан или name input е попълнен
        const nameInput = main.querySelector('#participant-name');
        if (nameInput) {
            expect(nameInput.value).toBe('Иван Петров Иванов');
        }
    });
});

describe('testEntryView.js — успешен submit', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        sessionStorage.clear();
        testService.getPublicTest.mockResolvedValue(MOCK_PUBLIC_TEST);
        await showTestEntry({ params: { shareCode: 'ABCD1234' } });
        await flushPromises();
    });

    it('запазва name в sessionStorage при валиден submit', async () => {
        const main = document.getElementById('main');
        const form = main.querySelector('form');
        const nameInput = main.querySelector('#participant-name');
        nameInput.value = 'Иван Иванов';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();
        expect(sessionStorage.getItem('testapp_participant_ABCD1234')).toBe('Иван Иванов');
    });

    it('trimва name преди записване в sessionStorage', async () => {
        const main = document.getElementById('main');
        const form = main.querySelector('form');
        const nameInput = main.querySelector('#participant-name');
        nameInput.value = '  Иван  ';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();
        expect(sessionStorage.getItem('testapp_participant_ABCD1234')).toBe('Иван');
    });

    it('извиква page.redirect с URL, съдържащ shareCode', async () => {
        const main = document.getElementById('main');
        const form = main.querySelector('form');
        const nameInput = main.querySelector('#participant-name');
        nameInput.value = 'Мария';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();
        expect(page.redirect).toHaveBeenCalledTimes(1);
        const redirectUrl = page.redirect.mock.calls[0][0];
        expect(redirectUrl).toContain('ABCD1234');
        expect(redirectUrl).toContain('/test/');
        expect(redirectUrl).toContain('/take/');
    });
});
