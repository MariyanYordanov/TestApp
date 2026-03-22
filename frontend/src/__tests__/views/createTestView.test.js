// Тестове за views/createTestView.js

vi.mock('../../services/auth.js', () => ({
    isAuthenticated: vi.fn().mockReturnValue(true),
    getToken: vi.fn(),
    getUser: vi.fn(),
}));

vi.mock('../../lib/page.min.js', () => ({
    default: { redirect: vi.fn(), start: vi.fn() },
}));

const { showCreateTest } = await import('../../views/createTestView.js');
const page = (await import('../../lib/page.min.js')).default;

// ---------------------------------------------------------------------------
// Помощна функция за ctx обект (page.js context)
// ---------------------------------------------------------------------------
function makeCtx(overrides = {}) {
    return { params: {}, ...overrides };
}

// ---------------------------------------------------------------------------
// showCreateTest — начален рендер (Стъпка 1)
// ---------------------------------------------------------------------------

describe('createTestView — начален рендер', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        showCreateTest(makeCtx());
    });

    it('рендира съдържание в #main', () => {
        const main = document.getElementById('main');
        expect(main.children.length).toBeGreaterThan(0);
    });

    it('показва stepper с 4 стъпки', () => {
        const main = document.getElementById('main');
        const steps = main.querySelectorAll('[data-step]');
        expect(steps.length).toBe(4);
    });

    it('стъпка 0 е активна по подразбиране', () => {
        const main = document.getElementById('main');
        const activeStep = main.querySelector('[data-step].active');
        expect(activeStep).not.toBeNull();
        expect(activeStep.dataset.step).toBe('0');
    });

    it('рендира поле за заглавие (Стъпка 1)', () => {
        const main = document.getElementById('main');
        expect(main.querySelector('#test-title')).not.toBeNull();
    });

    it('рендира поле за описание (Стъпка 1)', () => {
        const main = document.getElementById('main');
        expect(main.querySelector('#test-description')).not.toBeNull();
    });

    it('рендира бутон "Напред"', () => {
        const main = document.getElementById('main');
        const nextBtn = main.querySelector('[data-action="next"]');
        expect(nextBtn).not.toBeNull();
    });

    it('не рендира бутон "Назад" на Стъпка 1', () => {
        const main = document.getElementById('main');
        const backBtn = main.querySelector('[data-action="back"]');
        expect(backBtn).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Навигация — "Напред" с валидация
// ---------------------------------------------------------------------------

describe('createTestView — навигация към Стъпка 2', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        showCreateTest(makeCtx());
    });

    it('при невалидни данни не преминава към Стъпка 2', () => {
        const main = document.getElementById('main');
        const nextBtn = main.querySelector('[data-action="next"]');
        nextBtn.click();
        // Трябва да остане на Стъпка 1
        expect(main.querySelector('#test-title')).not.toBeNull();
    });

    it('показва грешки при клик "Напред" с празни полета', () => {
        const main = document.getElementById('main');
        const nextBtn = main.querySelector('[data-action="next"]');
        nextBtn.click();
        const errors = main.querySelectorAll('.form-error');
        expect(errors.length).toBeGreaterThan(0);
    });

    it('преминава към Стъпка 2 при валидни данни', () => {
        const main = document.getElementById('main');
        main.querySelector('#test-title').value = 'Тест по JS';
        main.querySelector('#test-title').dispatchEvent(new Event('input'));
        main.querySelector('#test-description').value = 'Описание поне десет символа';
        main.querySelector('#test-description').dispatchEvent(new Event('input'));

        const nextBtn = main.querySelector('[data-action="next"]');
        nextBtn.click();

        // На Стъпка 2 трябва да има checkboxes за категории
        const checkboxes = main.querySelectorAll('input[type="checkbox"]');
        expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('стъпка 1 е активна след навигация към Стъпка 2', () => {
        const main = document.getElementById('main');
        main.querySelector('#test-title').value = 'Тест по JS';
        main.querySelector('#test-title').dispatchEvent(new Event('input'));
        main.querySelector('#test-description').value = 'Описание поне десет символа';
        main.querySelector('#test-description').dispatchEvent(new Event('input'));

        main.querySelector('[data-action="next"]').click();

        const activeStep = main.querySelector('[data-step].active');
        expect(activeStep.dataset.step).toBe('1');
    });
});

describe('createTestView — навигация към Стъпка 3', () => {
    function goToStep2(main) {
        main.querySelector('#test-title').value = 'Тест по JS';
        main.querySelector('#test-title').dispatchEvent(new Event('input'));
        main.querySelector('#test-description').value = 'Описание поне десет символа';
        main.querySelector('#test-description').dispatchEvent(new Event('input'));
        main.querySelector('[data-action="next"]').click();
    }

    beforeEach(() => {
        vi.clearAllMocks();
        showCreateTest(makeCtx());
    });

    it('показва грешки при клик "Напред" без избрана категория', () => {
        const main = document.getElementById('main');
        goToStep2(main);
        main.querySelector('[data-action="next"]').click();
        const errors = main.querySelectorAll('.form-error');
        expect(errors.length).toBeGreaterThan(0);
    });

    it('преминава към Стъпка 3 при избрана категория', () => {
        const main = document.getElementById('main');
        goToStep2(main);

        // Избираме първата категория
        const firstCheckbox = main.querySelector('input[type="checkbox"]');
        firstCheckbox.checked = true;
        firstCheckbox.dispatchEvent(new Event('change'));

        main.querySelector('[data-action="next"]').click();

        // На Стъпка 3 трябва да има бутон "Добави въпрос"
        const addBtn = main.querySelector('[data-action="add-question"]');
        expect(addBtn).not.toBeNull();
    });
});

describe('createTestView — навигация "Назад"', () => {
    function goToStep2(main) {
        main.querySelector('#test-title').value = 'Тест по JS';
        main.querySelector('#test-title').dispatchEvent(new Event('input'));
        main.querySelector('#test-description').value = 'Описание поне десет символа';
        main.querySelector('#test-description').dispatchEvent(new Event('input'));
        main.querySelector('[data-action="next"]').click();
    }

    beforeEach(() => {
        vi.clearAllMocks();
        showCreateTest(makeCtx());
    });

    it('бутонът "Назад" се появява от Стъпка 2', () => {
        const main = document.getElementById('main');
        goToStep2(main);
        const backBtn = main.querySelector('[data-action="back"]');
        expect(backBtn).not.toBeNull();
    });

    it('клик "Назад" от Стъпка 2 се връща на Стъпка 1', () => {
        const main = document.getElementById('main');
        goToStep2(main);
        main.querySelector('[data-action="back"]').click();
        expect(main.querySelector('#test-title')).not.toBeNull();
    });

    it('след "Назад" stepper показва Стъпка 0 като активна', () => {
        const main = document.getElementById('main');
        goToStep2(main);
        main.querySelector('[data-action="back"]').click();
        const activeStep = main.querySelector('[data-step].active');
        expect(activeStep.dataset.step).toBe('0');
    });
});

// ---------------------------------------------------------------------------
// createTestView — запазване на state при навигация
// ---------------------------------------------------------------------------

describe('createTestView — запазване на state', () => {
    it('запазва въведените данни при навигация напред-назад', () => {
        showCreateTest(makeCtx());
        const main = document.getElementById('main');

        // Въвеждаме данни
        main.querySelector('#test-title').value = 'Моят тест';
        main.querySelector('#test-title').dispatchEvent(new Event('input'));
        main.querySelector('#test-description').value = 'Подробно описание тук';
        main.querySelector('#test-description').dispatchEvent(new Event('input'));
        main.querySelector('[data-action="next"]').click();

        // Връщаме се
        main.querySelector('[data-action="back"]').click();

        // Данните трябва да се запазят
        expect(main.querySelector('#test-title').value).toBe('Моят тест');
        expect(main.querySelector('#test-description').value).toBe('Подробно описание тук');
    });
});

// ---------------------------------------------------------------------------
// Навигация до Стъпка 3 (Въпроси) и Стъпка 4 (Преглед)
// ---------------------------------------------------------------------------

describe('createTestView — навигация до Стъпка 4 (Преглед)', () => {
    function goToStep3(main) {
        // Стъпка 1 → 2
        main.querySelector('#test-title').value = 'Тест по JS';
        main.querySelector('#test-title').dispatchEvent(new Event('input'));
        main.querySelector('#test-description').value = 'Описание поне десет символа';
        main.querySelector('#test-description').dispatchEvent(new Event('input'));
        main.querySelector('[data-action="next"]').click();

        // Стъпка 2 → 3
        const firstCheckbox = main.querySelector('input[type="checkbox"]');
        firstCheckbox.checked = true;
        firstCheckbox.dispatchEvent(new Event('change'));
        main.querySelector('[data-action="next"]').click();
    }

    beforeEach(() => {
        vi.clearAllMocks();
        showCreateTest(makeCtx());
    });

    it('показва грешки при клик "Напред" без въпроси', () => {
        const main = document.getElementById('main');
        goToStep3(main);
        main.querySelector('[data-action="next"]').click();
        const errors = main.querySelectorAll('.form-error');
        expect(errors.length).toBeGreaterThan(0);
    });

    // Помощна функция за достигане на Стъпка 4
    function goToStep4(main) {
        // Добавяме въпрос — DOM се ре-рендира
        main.querySelector('[data-action="add-question"]').click();

        // Попълваме текст — всяко input event предизвиква re-render
        // Затова ползваме само 1 input event с пълния текст, после ползваме fresh ref
        main.querySelector('textarea').value = 'Какво е JavaScript?';
        main.querySelector('textarea').dispatchEvent(new Event('input'));

        // Попълваме отговорите (fresh refs след re-render)
        main.querySelectorAll('[data-answer-id] input[type="text"]')[0].value = 'Програмен език';
        main.querySelectorAll('[data-answer-id] input[type="text"]')[0].dispatchEvent(new Event('input'));

        main.querySelectorAll('[data-answer-id] input[type="text"]')[1].value = 'База данни';
        main.querySelectorAll('[data-answer-id] input[type="text"]')[1].dispatchEvent(new Event('input'));

        // Маркираме верен отговор (fresh ref след re-render)
        main.querySelectorAll('input[type="radio"]')[0].dispatchEvent(new Event('change'));

        // Преминаваме към Стъпка 4
        main.querySelector('[data-action="next"]').click();
    }

    it('преминава към Стъпка 4 след добавяне на валиден въпрос', () => {
        const main = document.getElementById('main');
        goToStep3(main);
        goToStep4(main);

        // На Стъпка 4 трябва да има бутон "Запази като чернова"
        const saveBtn = main.querySelector('[data-action="save-draft"]');
        expect(saveBtn).not.toBeNull();
    });

    it('на Стъпка 4 няма бутон "Напред"', () => {
        const main = document.getElementById('main');
        goToStep3(main);
        goToStep4(main);

        const nextBtn = main.querySelector('[data-action="next"]');
        expect(nextBtn).toBeNull();
    });

    it('бутон "Назад" от Стъпка 4 (в stepPreviewView) се връща на Стъпка 3', () => {
        const main = document.getElementById('main');
        goToStep3(main);
        goToStep4(main);

        // Натискаме "Назад" от preview
        main.querySelector('[data-action="back"]').click();

        // Трябва да сме на Стъпка 3
        const addBtn = main.querySelector('[data-action="add-question"]');
        expect(addBtn).not.toBeNull();
    });
});
