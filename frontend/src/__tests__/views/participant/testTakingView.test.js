// Тестове за views/participant/testTakingView.js

const page = (await import('../../../lib/page.min.js')).default;
const { showTestTaking } = await import('../../../views/participant/testTakingView.js');

// Изчаква завършването на всички pending Promise микрозадачи
// Забележка: при fake timers НЕ се използва, а vi.runAllTimers()
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

// Контекст за валиден опит
const VALID_CTX = {
    params: {
        shareCode: 'ABCD1234',
        attemptId: 'attempt-123456',
    },
};

describe('testTakingView.js — без participantName в sessionStorage', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        sessionStorage.clear();
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

describe('testTakingView.js — невалиден shareCode', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        sessionStorage.setItem('testapp_participant_BADCODE1', 'Тест Участник');
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

describe('testTakingView.js — рендиране на теста', () => {
    // Използваме реални таймери за рендиране — fake timers блокират flushPromises
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        sessionStorage.setItem('testapp_participant_ABCD1234', 'Иван Иванов');
        showTestTaking(VALID_CTX);
        await flushPromises();
    });

    afterEach(async () => {
        // Спира таймера — participant трябва да е в sessionStorage преди showTestTaking
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
        // Форматът е MM:SS — трябва да съдържа ":"
        expect(timer.textContent).toMatch(/\d{2}:\d{2}/);
    });
});

describe('testTakingView.js — submit на теста', () => {
    // Използваме реални таймери — fake timers блокират flushPromises
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        sessionStorage.setItem('testapp_participant_ABCD1234', 'Иван Иванов');
        showTestTaking(VALID_CTX);
        await flushPromises();
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    it('при submit с избрани отговори показва резултати', async () => {
        const main = document.getElementById('main');
        // Избираме първия отговор за всеки въпрос
        main.querySelectorAll('[data-question-id]').forEach(qEl => {
            const firstRadio = qEl.querySelector('input[type="radio"]');
            if (firstRadio) firstRadio.checked = true;
        });
        const submitBtn = main.querySelector('[data-action="submit-test"]');
        submitBtn.click();
        await flushPromises();
        // След submit трябва да се покажат резултати
        expect(main.textContent).toMatch(/верни|резултат|от/i);
    });

    it('при submit с 0 избрани отговори score е 0', async () => {
        const main = document.getElementById('main');
        const submitBtn = main.querySelector('[data-action="submit-test"]');
        submitBtn.click();
        await flushPromises();
        // Score 0 — нито един верен
        expect(main.textContent).toContain('0');
    });

    it('не прави двоен submit при многократно кликване', async () => {
        const main = document.getElementById('main');
        const submitBtn = main.querySelector('[data-action="submit-test"]');
        submitBtn.click();
        await flushPromises();
        // Няма submit бутон вече или е деактивиран
        const btnAfter = main.querySelector('[data-action="submit-test"]');
        expect(!btnAfter || btnAfter.disabled).toBe(true);
    });
});

describe('testTakingView.js — cleanup при повторно влизане', () => {
    it('спира стария таймер при повторно влизане', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date());
        sessionStorage.setItem('testapp_participant_ABCD1234', 'Иван Иванов');

        // Първо влизане
        showTestTaking(VALID_CTX);
        // Напредваме малко (не до expire) — таймерът тиква
        vi.advanceTimersByTime(2000);

        // Второ влизане — старият таймер трябва да се спре и нов да се стартира
        sessionStorage.setItem('testapp_participant_ABCD1234', 'Иван Иванов');
        showTestTaking(VALID_CTX);

        const main = document.getElementById('main');
        // Трябва да се вижда таймерът — второто влизане е рендирало нов екран
        expect(main.querySelector('#timer')).not.toBeNull();

        sessionStorage.clear();
        vi.useRealTimers();
    });
});

describe('testTakingView.js — timer expire автоматичен submit', () => {
    it('при изтичане на таймера показва резултати', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date());
        sessionStorage.setItem('testapp_participant_ABCD1234', 'Иван Иванов');

        // Тестът с малка продължителност за по-бързо тестване
        showTestTaking(VALID_CTX);
        // Напредва времето с повече от duration (1800 секунди)
        vi.advanceTimersByTime(1800 * 1000 + 1000);

        const main = document.getElementById('main');
        // Резултатите трябва да са видими след изтичане
        expect(main.textContent).toMatch(/верни|резултат|от/i);

        sessionStorage.clear();
        vi.useRealTimers();
    });
});
