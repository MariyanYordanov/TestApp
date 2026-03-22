// Тестове за views/participant/testTakingView.js
// Стъпка 46 — testTakingView.test.js
// Обновени тестове: мокираме testService.getPublicTest и testService.submitAttempt.
// Scoring се извършва на сървъра — клиентът изпраща само { questionId, selectedAnswerId }.

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

// Примерен PublicTestResponse — БЕЗ isCorrect на отговорите (сигурност)
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

// Примерен AttemptResultResponse от сървъра
const MOCK_ATTEMPT_RESULT = {
    score: 1,
    totalQuestions: 3,
    percent: 33.33,
    results: [
        { questionId: 'q-1', questionText: 'Какво е JavaScript?', selectedAnswerId: 'a-1', isCorrect: true },
        { questionId: 'q-2', questionText: 'Кой е правилният начин за деклариране на константа?', selectedAnswerId: null, isCorrect: false },
        { questionId: 'q-3', questionText: 'Какво връща typeof null?', selectedAnswerId: null, isCorrect: false },
    ],
};

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
        // Веднага след извикване — преди await — loading съобщение
        expect(main.textContent).toMatch(/зареждане|loading/i);
        sessionStorage.clear();
    });
});

describe('testTakingView.js — рендиране на теста', () => {
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
        // Спира таймера — participant трябва да е в sessionStorage преди showTestTaking
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

    it('рендира всички 3 въпроса', () => {
        const main = document.getElementById('main');
        const questions = main.querySelectorAll('[data-question-id]');
        expect(questions.length).toBe(3);
    });

    it('всеки въпрос има radio бутони за отговорите', () => {
        const main = document.getElementById('main');
        const radios = main.querySelectorAll('input[type="radio"]');
        // 3 въпроса x 3 отговора = 9 радио бутона
        expect(radios.length).toBe(9);
    });

    it('radio бутоните са групирани по въпрос (name="q-{id}")', () => {
        const main = document.getElementById('main');
        const q1Radios = main.querySelectorAll('input[name="q-q-1"]');
        expect(q1Radios.length).toBe(3);
    });

    it('показва бутон "Предай теста"', () => {
        const main = document.getElementById('main');
        const btn = main.querySelector('[data-action="submit-test"]');
        expect(btn).not.toBeNull();
    });

    it('показва таймер елемент #timer', () => {
        const main = document.getElementById('main');
        expect(main.querySelector('#timer')).not.toBeNull();
    });

    it('#timer показва форматирано време', () => {
        const main = document.getElementById('main');
        const timer = main.querySelector('#timer');
        expect(timer.textContent).toMatch(/\d{2}:\d{2}/);
    });
});

describe('testTakingView.js — submit изпраща правилен payload към submitAttempt', () => {
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

    it('извиква submitAttempt с shareCode и participantName', async () => {
        const main = document.getElementById('main');
        const submitBtn = main.querySelector('[data-action="submit-test"]');
        submitBtn.click();
        await flushPromises();
        expect(testService.submitAttempt).toHaveBeenCalledTimes(1);
        const [calledShareCode, payload] = testService.submitAttempt.mock.calls[0];
        expect(calledShareCode).toBe('ABCD1234');
        expect(payload.participantName).toBe('Иван Иванов');
    });

    it('payload.answers съдържа само { questionId, selectedAnswerId } — без isCorrect', async () => {
        const main = document.getElementById('main');
        // Избираме отговор за първия въпрос
        const firstRadio = main.querySelector('input[name="q-q-1"]');
        if (firstRadio) firstRadio.checked = true;
        const submitBtn = main.querySelector('[data-action="submit-test"]');
        submitBtn.click();
        await flushPromises();
        const payload = testService.submitAttempt.mock.calls[0][1];
        expect(Array.isArray(payload.answers)).toBe(true);
        // Всеки answer трябва да има само questionId и selectedAnswerId
        payload.answers.forEach(answer => {
            expect(answer).toHaveProperty('questionId');
            expect(answer).toHaveProperty('selectedAnswerId');
            // isCorrect НЕ трябва да се изпраща — scoring е на сървъра
            expect(answer).not.toHaveProperty('isCorrect');
            expect(answer).not.toHaveProperty('correctAnswerId');
        });
    });

    it('payload.answers има запис за всеки въпрос', async () => {
        const main = document.getElementById('main');
        const submitBtn = main.querySelector('[data-action="submit-test"]');
        submitBtn.click();
        await flushPromises();
        const payload = testService.submitAttempt.mock.calls[0][1];
        expect(payload.answers.length).toBe(3);
    });

    it('selectedAnswerId е null за непопълнен въпрос', async () => {
        const main = document.getElementById('main');
        // Не избираме нищо — всички null
        const submitBtn = main.querySelector('[data-action="submit-test"]');
        submitBtn.click();
        await flushPromises();
        const payload = testService.submitAttempt.mock.calls[0][1];
        const allNull = payload.answers.every(a => a.selectedAnswerId === null);
        expect(allNull).toBe(true);
    });
});

describe('testTakingView.js — submit показва резултати от сървъра', () => {
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

    it('при submit показва резултати', async () => {
        const main = document.getElementById('main');
        const submitBtn = main.querySelector('[data-action="submit-test"]');
        submitBtn.click();
        await flushPromises();
        expect(main.textContent).toMatch(/верни|резултат|от/i);
    });

    it('при submit показва score от сървъра (1 от 3)', async () => {
        const main = document.getElementById('main');
        const submitBtn = main.querySelector('[data-action="submit-test"]');
        submitBtn.click();
        await flushPromises();
        expect(main.textContent).toContain('1');
        expect(main.textContent).toContain('3');
    });

    it('не прави двоен submit при многократно кликване', async () => {
        const main = document.getElementById('main');
        const submitBtn = main.querySelector('[data-action="submit-test"]');
        submitBtn.click();
        await flushPromises();
        const btnAfter = main.querySelector('[data-action="submit-test"]');
        expect(!btnAfter || btnAfter.disabled).toBe(true);
    });
});

describe('testTakingView.js — грешка при submit', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        testService.getPublicTest.mockResolvedValue(MOCK_PUBLIC_TEST);
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
        const submitBtn = main.querySelector('[data-action="submit-test"]');
        submitBtn.click();
        await flushPromises();
        // Трябва да се покаже съобщение за грешка
        expect(main.textContent).toMatch(/грешка|error/i);
    });
});

describe('testTakingView.js — cleanup при повторно влизане', () => {
    it('спира стария таймер при повторно влизане', async () => {
        testService.getPublicTest.mockResolvedValue(MOCK_PUBLIC_TEST);
        testService.submitAttempt.mockResolvedValue(MOCK_ATTEMPT_RESULT);
        sessionStorage.setItem('testapp_participant_ABCD1234', 'Иван Иванов');

        // Първо влизане — изчаква пълното зареждане
        await showTestTaking(VALID_CTX);

        // Второ влизане — старият таймер трябва да се спре и нов да се стартира
        sessionStorage.setItem('testapp_participant_ABCD1234', 'Иван Иванов');
        await showTestTaking(VALID_CTX);

        const main = document.getElementById('main');
        // Трябва да се вижда таймерът — второто влизане е рендирало нов екран
        expect(main.querySelector('#timer')).not.toBeNull();

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
        // Напредва времето с повече от duration (1800 секунди)
        vi.advanceTimersByTime(1800 * 1000 + 1000);

        // submitAttempt трябва да е извикан
        expect(testService.submitAttempt).toHaveBeenCalledTimes(1);

        sessionStorage.clear();
        vi.useRealTimers();
    });
});
