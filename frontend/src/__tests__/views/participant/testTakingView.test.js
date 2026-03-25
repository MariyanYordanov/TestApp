// Тестове за views/participant/testTakingView.js
// Обновени за навигационния дизайн (1 въпрос на страница) и Code тип.

vi.mock('../../../services/testService.js', () => ({
    getPublicTest: vi.fn(),
    submitAttempt: vi.fn(),
}));

const page = (await import('../../../lib/page.min.js')).default;
const { showTestTaking } = await import('../../../views/participant/testTakingView.js');
const testService = await import('../../../services/testService.js');

// Изчаква завършването на всички pending Promise микрозадачи
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

// Контекст за валиден опит
const VALID_CTX = {
    params: {
        shareCode: 'ABCD1234',
        attemptId: 'attempt-123456',
    },
};

// Примерен PublicTestResponse — 3 Closed въпроса
const MOCK_PUBLIC_TEST = {
    shareCode: 'ABCD1234',
    title: 'Тест по JavaScript',
    description: 'Основни концепции на JavaScript.',
    duration: 1800,
    questions: [
        {
            id: 'q-1',
            text: 'Какво е JavaScript?',
            type: 'Closed',
            answers: [
                { id: 'a-1', text: 'Програмен език' },
                { id: 'a-2', text: 'База данни' },
                { id: 'a-3', text: 'Операционна система' },
            ],
        },
        {
            id: 'q-2',
            text: 'Кой е правилният начин за деклариране на константа?',
            type: 'Closed',
            answers: [
                { id: 'a-4', text: 'var x = 5' },
                { id: 'a-5', text: 'const x = 5' },
                { id: 'a-6', text: 'x := 5' },
            ],
        },
        {
            id: 'q-3',
            text: 'Какво връща typeof null?',
            type: 'Closed',
            answers: [
                { id: 'a-7', text: '"null"' },
                { id: 'a-8', text: '"object"' },
                { id: 'a-9', text: '"undefined"' },
            ],
        },
    ],
};

// Тест с 1 въпрос — бутонът "Предай теста" се вижда веднага
const MOCK_SINGLE_TEST = {
    shareCode: 'ABCD1234',
    title: 'Кратък тест',
    description: '',
    duration: 1800,
    questions: [
        {
            id: 'q-1',
            text: 'Какво е JavaScript?',
            type: 'Closed',
            answers: [
                { id: 'a-1', text: 'Програмен език' },
                { id: 'a-2', text: 'База данни' },
            ],
        },
    ],
};

// Тест с Code въпрос
const MOCK_CODE_TEST = {
    shareCode: 'ABCD1234',
    title: 'Тест с код',
    description: '',
    duration: 1800,
    questions: [
        {
            id: 'q-code-1',
            text: 'Напиши функция за factorial.',
            type: 'Code',
            answers: [],
        },
    ],
};

// Примерен AttemptResultResponse от сървъра
const MOCK_ATTEMPT_RESULT = {
    score: 1,
    totalQuestions: 3,
    percent: 33.33,
    results: [
        { questionId: 'q-1', questionText: 'Какво е JavaScript?', selectedAnswerId: 'a-1', isCorrect: true },
        { questionId: 'q-2', questionText: 'Кой е правилният начин?', selectedAnswerId: null, isCorrect: false },
        { questionId: 'q-3', questionText: 'Какво връща typeof null?', selectedAnswerId: null, isCorrect: false },
    ],
};

const MOCK_SINGLE_RESULT = {
    score: 0,
    totalQuestions: 1,
    percent: 0,
    results: [{ questionId: 'q-1', questionText: 'Какво е JavaScript?', selectedAnswerId: null, isCorrect: false }],
};

// Помощна функция — намиране на бутон по текст
function findButtonByText(container, text) {
    return [...container.querySelectorAll('button')].find(b => b.textContent.trim().includes(text)) ?? null;
}

// ---------------------------------------------------------------------------

describe('testTakingView.js — без participantName в sessionStorage', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        sessionStorage.clear();
        testService.getPublicTest.mockResolvedValue(MOCK_PUBLIC_TEST);
        await showTestTaking(VALID_CTX);
        await flushPromises();
    });

    it('пренасочва към entry view', () => {
        expect(page.redirect).toHaveBeenCalledWith('/test/ABCD1234');
    });

    it('не рендира въпроси', () => {
        const main = document.getElementById('main');
        expect(main.querySelectorAll('[data-question-id]').length).toBe(0);
    });
});

describe('testTakingView.js — невалиден shareCode (null от сървъра)', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        sessionStorage.setItem('testapp_participant_BADCODE1', 'Тест Участник');
        testService.getPublicTest.mockResolvedValue(null);
        await showTestTaking({ params: { shareCode: 'BADCODE1', attemptId: 'attempt-1' } });
        await flushPromises();
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    it('показва error съобщение', () => {
        const main = document.getElementById('main');
        const errorEl = main.querySelector('.error-card') ?? main.querySelector('[class*="error"]');
        expect(errorEl).not.toBeNull();
    });
});

describe('testTakingView.js — грешка от сървъра при зареждане', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        sessionStorage.setItem('testapp_participant_ERRCODE', 'Иван Иванов');
        testService.getPublicTest.mockRejectedValue(new Error('Network error'));
        await showTestTaking({ params: { shareCode: 'ERRCODE', attemptId: 'attempt-1' } });
        await flushPromises();
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    it('показва error card при мрежова грешка', () => {
        const main = document.getElementById('main');
        const errorEl = main.querySelector('.error-card') ?? main.querySelector('[class*="error"]');
        expect(errorEl).not.toBeNull();
    });
});

describe('testTakingView.js — loading state', () => {
    it('показва loading елемент преди API отговор', async () => {
        testService.getPublicTest.mockReturnValue(new Promise(() => {}));
        sessionStorage.setItem('testapp_participant_ABCD1234', 'Иван Иванов');
        const main = document.getElementById('main');
        showTestTaking(VALID_CTX);
        expect(main.textContent).toMatch(/зареждане|loading/i);
        sessionStorage.clear();
    });
});

describe('testTakingView.js — рендиране на теста (1 въпрос наведнъж)', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        testService.getPublicTest.mockResolvedValue(MOCK_PUBLIC_TEST);
        testService.submitAttempt.mockResolvedValue(MOCK_ATTEMPT_RESULT);
        sessionStorage.setItem('testapp_participant_ABCD1234', 'Иван Иванов');
        showTestTaking(VALID_CTX);
        await flushPromises();
    });

    afterEach(async () => {
        testService.getPublicTest.mockResolvedValue(MOCK_PUBLIC_TEST);
        testService.submitAttempt.mockResolvedValue(MOCK_ATTEMPT_RESULT);
        sessionStorage.setItem('testapp_participant_ABCD1234', '_cleanup_');
        showTestTaking({ params: { shareCode: 'ABCD1234', attemptId: 'x' } });
        sessionStorage.clear();
    });

    it('рендира заглавието на теста', () => {
        const main = document.getElementById('main');
        expect(main.textContent).toContain('Тест по JavaScript');
    });

    it('показва 1 въпрос наведнъж (навигационен дизайн)', () => {
        const main = document.getElementById('main');
        const questions = main.querySelectorAll('[data-question-id]');
        expect(questions.length).toBe(1);
    });

    it('показва 3 progress dots за 3 въпроса', () => {
        const main = document.getElementById('main');
        const dots = main.querySelectorAll('.question-dot');
        expect(dots.length).toBe(3);
    });

    it('първият въпрос е активен по подразбиране', () => {
        const main = document.getElementById('main');
        const activeDot = main.querySelector('.question-dot.active');
        expect(activeDot).not.toBeNull();
        expect(activeDot.textContent.trim()).toBe('1');
    });

    it('показва радио бутоните за текущия въпрос (3 отговора)', () => {
        const main = document.getElementById('main');
        const radios = main.querySelectorAll('input[type="radio"]');
        expect(radios.length).toBe(3);
    });

    it('radio бутоните са групирани по въпрос (name="q-{id}")', () => {
        const main = document.getElementById('main');
        const q1Radios = main.querySelectorAll('input[name="q-q-1"]');
        expect(q1Radios.length).toBe(3);
    });

    it('показва таймер с форматирано начално време', () => {
        const main = document.getElementById('main');
        const timer = main.querySelector('.timer-display');
        expect(timer).not.toBeNull();
        expect(timer.textContent).toMatch(/\d{1,2}:\d{2}/);
    });

    it('показва бутон "Напред" (не е последен въпрос)', () => {
        const main = document.getElementById('main');
        const btn = findButtonByText(main, 'Напред');
        expect(btn).not.toBeNull();
    });

    it('"← Назад" е скрит на първия въпрос', () => {
        const main = document.getElementById('main');
        const backBtn = findButtonByText(main, 'Назад');
        // Или не съществува, или е invisible
        expect(!backBtn || backBtn.style.visibility === 'hidden').toBe(true);
    });
});

describe('testTakingView.js — навигация между въпроси', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        testService.getPublicTest.mockResolvedValue(MOCK_PUBLIC_TEST);
        testService.submitAttempt.mockResolvedValue(MOCK_ATTEMPT_RESULT);
        sessionStorage.setItem('testapp_participant_ABCD1234', 'Иван Иванов');
        showTestTaking(VALID_CTX);
        await flushPromises();
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    it('клик "Напред" показва втория въпрос', async () => {
        const main = document.getElementById('main');
        findButtonByText(main, 'Напред').click();
        await flushPromises();
        const activeDot = main.querySelector('.question-dot.active');
        expect(activeDot.textContent.trim()).toBe('2');
    });

    it('след 2 клика "Напред" се вижда бутонът "Предай теста"', async () => {
        const main = document.getElementById('main');
        findButtonByText(main, 'Напред').click();
        await flushPromises();
        findButtonByText(main, 'Напред').click();
        await flushPromises();
        const submitBtn = findButtonByText(main, 'Предай теста');
        expect(submitBtn).not.toBeNull();
    });
});

describe('testTakingView.js — submit (1 въпрос)', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        testService.getPublicTest.mockResolvedValue(MOCK_SINGLE_TEST);
        testService.submitAttempt.mockResolvedValue(MOCK_SINGLE_RESULT);
        sessionStorage.setItem('testapp_participant_ABCD1234', 'Иван Иванов');
        showTestTaking(VALID_CTX);
        await flushPromises();
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    it('показва бутон "Предай теста" на единствения въпрос', () => {
        const main = document.getElementById('main');
        const btn = findButtonByText(main, 'Предай теста');
        expect(btn).not.toBeNull();
    });

    it('извиква submitAttempt с shareCode и participantName', async () => {
        const main = document.getElementById('main');
        findButtonByText(main, 'Предай теста').click();
        await flushPromises();
        expect(testService.submitAttempt).toHaveBeenCalledTimes(1);
        const [calledShareCode, payload] = testService.submitAttempt.mock.calls[0];
        expect(calledShareCode).toBe('ABCD1234');
        expect(payload.participantName).toBe('Иван Иванов');
    });

    it('payload.answers има запис за всеки въпрос', async () => {
        const main = document.getElementById('main');
        findButtonByText(main, 'Предай теста').click();
        await flushPromises();
        const payload = testService.submitAttempt.mock.calls[0][1];
        expect(payload.answers.length).toBe(1);
    });

    it('payload.answers не изпраща isCorrect (scoring е на сървъра)', async () => {
        const main = document.getElementById('main');
        findButtonByText(main, 'Предай теста').click();
        await flushPromises();
        const payload = testService.submitAttempt.mock.calls[0][1];
        payload.answers.forEach(answer => {
            expect(answer).toHaveProperty('questionId');
            expect(answer).toHaveProperty('selectedAnswerId');
            expect(answer).not.toHaveProperty('isCorrect');
            expect(answer).not.toHaveProperty('correctAnswerId');
        });
    });

    it('selectedAnswerId е null за непопълнен въпрос', async () => {
        const main = document.getElementById('main');
        findButtonByText(main, 'Предай теста').click();
        await flushPromises();
        const payload = testService.submitAttempt.mock.calls[0][1];
        expect(payload.answers[0].selectedAnswerId).toBeNull();
    });
});

describe('testTakingView.js — submit показва резултати', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        testService.getPublicTest.mockResolvedValue(MOCK_SINGLE_TEST);
        testService.submitAttempt.mockResolvedValue(MOCK_SINGLE_RESULT);
        sessionStorage.setItem('testapp_participant_ABCD1234', 'Иван Иванов');
        showTestTaking(VALID_CTX);
        await flushPromises();
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    it('при submit показва резултати', async () => {
        const main = document.getElementById('main');
        findButtonByText(main, 'Предай теста').click();
        await flushPromises();
        expect(main.textContent).toMatch(/верни|резултат|от/i);
    });

    it('не прави двоен submit при многократно кликване', async () => {
        const main = document.getElementById('main');
        const submitBtn = findButtonByText(main, 'Предай теста');
        submitBtn.click();
        await flushPromises();
        // След submit бутонът вече не се вижда (резултатите са показани)
        const btnAfter = findButtonByText(main, 'Предай теста');
        expect(!btnAfter || btnAfter.disabled).toBe(true);
    });
});

describe('testTakingView.js — грешка при submit', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        testService.getPublicTest.mockResolvedValue(MOCK_SINGLE_TEST);
        testService.submitAttempt.mockRejectedValue(new Error('Submit failed'));
        sessionStorage.setItem('testapp_participant_ABCD1234', 'Иван Иванов');
        showTestTaking(VALID_CTX);
        await flushPromises();
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    it('показва грешка при неуспешен submit', async () => {
        const main = document.getElementById('main');
        findButtonByText(main, 'Предай теста').click();
        await flushPromises();
        expect(main.textContent).toMatch(/грешка|error/i);
    });
});

describe('testTakingView.js — cleanup при повторно влизане', () => {
    it('спира стария таймер при повторно влизане', async () => {
        testService.getPublicTest.mockResolvedValue(MOCK_PUBLIC_TEST);
        testService.submitAttempt.mockResolvedValue(MOCK_ATTEMPT_RESULT);
        sessionStorage.setItem('testapp_participant_ABCD1234', 'Иван Иванов');

        await showTestTaking(VALID_CTX);

        sessionStorage.setItem('testapp_participant_ABCD1234', 'Иван Иванов');
        await showTestTaking(VALID_CTX);

        const main = document.getElementById('main');
        expect(main.querySelector('.timer-display')).not.toBeNull();

        sessionStorage.clear();
    });
});

describe('testTakingView.js — timer expire автоматичен submit', () => {
    it('при изтичане на таймера извиква submitAttempt', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date());
        testService.getPublicTest.mockResolvedValue(MOCK_PUBLIC_TEST);
        testService.submitAttempt.mockResolvedValue(MOCK_ATTEMPT_RESULT);
        sessionStorage.setItem('testapp_participant_ABCD1234', 'Иван Иванов');

        showTestTaking(VALID_CTX);
        vi.advanceTimersByTime(1800 * 1000 + 1000);

        expect(testService.submitAttempt).toHaveBeenCalledTimes(1);

        sessionStorage.clear();
        vi.useRealTimers();
    });
});

describe('testTakingView.js — Code тип въпрос', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        testService.getPublicTest.mockResolvedValue(MOCK_CODE_TEST);
        testService.submitAttempt.mockResolvedValue({
            score: 0,
            totalQuestions: 0,
            percent: 0,
            results: [],
        });
        sessionStorage.setItem('testapp_participant_ABCD1234', 'Иван Иванов');
        showTestTaking(VALID_CTX);
        await flushPromises();
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    it('показва fallback textarea за Code въпрос', () => {
        const main = document.getElementById('main');
        const fallback = main.querySelector('.code-fallback');
        expect(fallback).not.toBeNull();
    });

    it('не показва radio/checkbox за Code въпрос', () => {
        const main = document.getElementById('main');
        const choices = main.querySelectorAll('input[type="radio"], input[type="checkbox"]');
        expect(choices.length).toBe(0);
    });

    it('при submit изпраща openText (стойност от fallback textarea)', async () => {
        const main = document.getElementById('main');
        const fallback = main.querySelector('.code-fallback');
        fallback.value = 'function factorial(n) { return n <= 1 ? 1 : n * factorial(n-1); }';
        findButtonByText(main, 'Предай теста').click();
        await flushPromises();
        expect(testService.submitAttempt).toHaveBeenCalledTimes(1);
        const [, payload] = testService.submitAttempt.mock.calls[0];
        const codeAnswer = payload.answers.find(a => a.questionId === 'q-code-1');
        expect(codeAnswer).toBeDefined();
        expect(codeAnswer.openText).toBe('function factorial(n) { return n <= 1 ? 1 : n * factorial(n-1); }');
        expect(codeAnswer.selectedAnswerId).toBeNull();
    });

    it('при submit изпраща openText: null за празен Code отговор', async () => {
        const main = document.getElementById('main');
        findButtonByText(main, 'Предай теста').click();
        await flushPromises();
        const [, payload] = testService.submitAttempt.mock.calls[0];
        const codeAnswer = payload.answers.find(a => a.questionId === 'q-code-1');
        expect(codeAnswer.openText).toBeNull();
    });
});
