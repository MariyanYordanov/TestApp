// Тестове за views/wizard/stepPreviewView.js
// Стъпка 44 — stepPreviewView.test.js
// Обновени: categories и onSave се подават като параметри.

vi.mock('../../../lib/page.min.js', () => ({
    default: { redirect: vi.fn(), start: vi.fn() },
}));

const { renderStepPreview } = await import('../../../views/wizard/stepPreviewView.js');
const page = (await import('../../../lib/page.min.js')).default;

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

// ---------------------------------------------------------------------------
// Тестови категории
// ---------------------------------------------------------------------------
const TEST_CATEGORIES = [
    { id: 'cat-1', name: 'Математика' },
    { id: 'cat-2', name: 'История' },
    { id: 'cat-4', name: 'JavaScript' },
];

// ---------------------------------------------------------------------------
// Примерен state за тестовете
// ---------------------------------------------------------------------------
function makeFullState(overrides = {}) {
    return {
        currentStep: 3,
        title: 'Тест по JavaScript',
        description: 'Описание на теста за JavaScript програмисти.',
        categoryIds: ['cat-1', 'cat-4'],
        questions: [
            {
                id: 'q-1',
                text: 'Какво е JavaScript?',
                answers: [
                    { id: 'a-1', text: 'Програмен език', isCorrect: true },
                    { id: 'a-2', text: 'База данни', isCorrect: false },
                ],
            },
        ],
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// renderStepPreview — структура
// ---------------------------------------------------------------------------

describe('renderStepPreview — структура', () => {
    it('връща DOM елемент', () => {
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn(), TEST_CATEGORIES);
        expect(el).toBeInstanceOf(HTMLElement);
    });

    it('показва заглавието на теста', () => {
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn(), TEST_CATEGORIES);
        expect(el.textContent).toContain('Тест по JavaScript');
    });

    it('показва описанието на теста', () => {
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn(), TEST_CATEGORIES);
        expect(el.textContent).toContain('Описание на теста за JavaScript програмисти.');
    });

    it('показва броя въпроси', () => {
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn(), TEST_CATEGORIES);
        expect(el.textContent).toContain('1');
    });

    it('рендира readonly карти за всеки въпрос', () => {
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn(), TEST_CATEGORIES);
        const questionCards = el.querySelectorAll('.question-card');
        expect(questionCards.length).toBe(1);
    });

    it('рендира readonly карти за 3 въпроса', () => {
        const state = makeFullState({
            questions: [
                { id: 'q-1', text: 'В1', answers: [{ id: 'a-1', text: 'О1', isCorrect: true }] },
                { id: 'q-2', text: 'В2', answers: [{ id: 'a-2', text: 'О2', isCorrect: true }] },
                { id: 'q-3', text: 'В3', answers: [{ id: 'a-3', text: 'О3', isCorrect: true }] },
            ],
        });
        const el = renderStepPreview(state, vi.fn(), TEST_CATEGORIES);
        const questionCards = el.querySelectorAll('.question-card');
        expect(questionCards.length).toBe(3);
    });

    it('не съдържа input или textarea елементи (само readonly)', () => {
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn(), TEST_CATEGORIES);
        expect(el.querySelectorAll('input, textarea').length).toBe(0);
    });

    it('показва имената на избраните категории', () => {
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn(), TEST_CATEGORIES);
        // cat-1 = Математика, cat-4 = JavaScript
        expect(el.textContent).toContain('Математика');
        expect(el.textContent).toContain('JavaScript');
    });
});

// ---------------------------------------------------------------------------
// renderStepPreview — бутон "Запази като чернова" с onSave
// ---------------------------------------------------------------------------

describe('renderStepPreview — бутон "Запази като чернова" с onSave', () => {
    it('рендира бутон за запазване', () => {
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn(), TEST_CATEGORIES);
        const saveBtn = el.querySelector('[data-action="save-draft"]');
        expect(saveBtn).not.toBeNull();
    });

    it('при клик извиква onSave(state) когато е подаден', async () => {
        vi.clearAllMocks();
        const onSave = vi.fn().mockResolvedValue({ id: 'new-test-id' });
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn(), TEST_CATEGORIES, onSave);
        const saveBtn = el.querySelector('[data-action="save-draft"]');
        saveBtn.click();
        await flushPromises();
        expect(onSave).toHaveBeenCalledWith(state);
    });

    it('при успешен onSave пренасочва към /dashboard', async () => {
        vi.clearAllMocks();
        const onSave = vi.fn().mockResolvedValue({ id: 'new-test-id' });
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn(), TEST_CATEGORIES, onSave);
        const saveBtn = el.querySelector('[data-action="save-draft"]');
        saveBtn.click();
        await flushPromises();
        expect(page.redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('деактивира бутона по време на запазване', async () => {
        vi.clearAllMocks();
        let resolvePromise;
        const onSave = vi.fn().mockReturnValue(new Promise(resolve => { resolvePromise = resolve; }));
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn(), TEST_CATEGORIES, onSave);
        const saveBtn = el.querySelector('[data-action="save-draft"]');
        saveBtn.click();
        // Бутонът трябва да е деактивиран докато се зарежда
        expect(saveBtn.disabled).toBe(true);
        resolvePromise({ id: 'test-id' });
        await flushPromises();
    });

    it('показва "Запазване..." по време на изпращане', async () => {
        vi.clearAllMocks();
        let resolvePromise;
        const onSave = vi.fn().mockReturnValue(new Promise(resolve => { resolvePromise = resolve; }));
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn(), TEST_CATEGORIES, onSave);
        const saveBtn = el.querySelector('[data-action="save-draft"]');
        saveBtn.click();
        expect(saveBtn.textContent).toContain('Запазване');
        resolvePromise({ id: 'test-id' });
        await flushPromises();
    });

    it('показва грешка при неуспешен onSave', async () => {
        vi.clearAllMocks();
        const onSave = vi.fn().mockRejectedValue(new Error('API грешка'));
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn(), TEST_CATEGORIES, onSave);
        const saveBtn = el.querySelector('[data-action="save-draft"]');
        saveBtn.click();
        await flushPromises();
        const errorEl = el.querySelector('.form-error');
        expect(errorEl).not.toBeNull();
    });

    it('при грешка бутонът се активира отново', async () => {
        vi.clearAllMocks();
        const onSave = vi.fn().mockRejectedValue(new Error('API грешка'));
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn(), TEST_CATEGORIES, onSave);
        const saveBtn = el.querySelector('[data-action="save-draft"]');
        saveBtn.click();
        await flushPromises();
        expect(saveBtn.disabled).toBe(false);
    });

    it('при клик без onSave прenасочва към /dashboard (backward compat)', async () => {
        vi.clearAllMocks();
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn(), TEST_CATEGORIES);
        const saveBtn = el.querySelector('[data-action="save-draft"]');
        saveBtn.click();
        await flushPromises();
        expect(page.redirect).toHaveBeenCalledWith('/dashboard');
    });
});

// ---------------------------------------------------------------------------
// renderStepPreview — бутон "Назад"
// ---------------------------------------------------------------------------

describe('renderStepPreview — бутон "Назад"', () => {
    it('рендира бутон "Назад"', () => {
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn(), TEST_CATEGORIES);
        const backBtn = el.querySelector('[data-action="back"]');
        expect(backBtn).not.toBeNull();
    });

    it('при клик извиква onBack', () => {
        const onBack = vi.fn();
        const state = makeFullState();
        const el = renderStepPreview(state, onBack, TEST_CATEGORIES);
        const backBtn = el.querySelector('[data-action="back"]');
        backBtn.click();
        expect(onBack).toHaveBeenCalled();
    });
});
