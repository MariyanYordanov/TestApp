// Тестове за views/wizard/stepPreviewView.js

vi.mock('../../../lib/page.min.js', () => ({
    default: { redirect: vi.fn(), start: vi.fn() },
}));

const { renderStepPreview } = await import('../../../views/wizard/stepPreviewView.js');
const page = (await import('../../../lib/page.min.js')).default;

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

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
        const el = renderStepPreview(state, vi.fn());
        expect(el).toBeInstanceOf(HTMLElement);
    });

    it('показва заглавието на теста', () => {
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn());
        expect(el.textContent).toContain('Тест по JavaScript');
    });

    it('показва описанието на теста', () => {
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn());
        expect(el.textContent).toContain('Описание на теста за JavaScript програмисти.');
    });

    it('показва броя въпроси', () => {
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn());
        expect(el.textContent).toContain('1');
    });

    it('рендира readonly карти за всеки въпрос', () => {
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn());
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
        const el = renderStepPreview(state, vi.fn());
        const questionCards = el.querySelectorAll('.question-card');
        expect(questionCards.length).toBe(3);
    });

    it('не съдържа input или textarea елементи (само readonly)', () => {
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn());
        expect(el.querySelectorAll('input, textarea').length).toBe(0);
    });
});

describe('renderStepPreview — бутон "Запази като чернова"', () => {
    it('рендира бутон за запазване', () => {
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn());
        const saveBtn = el.querySelector('[data-action="save-draft"]');
        expect(saveBtn).not.toBeNull();
    });

    it('при клик извиква page.redirect("/dashboard")', async () => {
        vi.clearAllMocks();
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn());
        const saveBtn = el.querySelector('[data-action="save-draft"]');
        saveBtn.click();
        await flushPromises();
        expect(page.redirect).toHaveBeenCalledWith('/dashboard');
        consoleSpy.mockRestore();
    });

    it('при клик не изтича state в конзолата', async () => {
        vi.clearAllMocks();
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn());
        const saveBtn = el.querySelector('[data-action="save-draft"]');
        saveBtn.click();
        await flushPromises();
        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});

describe('renderStepPreview — бутон "Назад"', () => {
    it('рендира бутон "Назад"', () => {
        const state = makeFullState();
        const el = renderStepPreview(state, vi.fn());
        const backBtn = el.querySelector('[data-action="back"]');
        expect(backBtn).not.toBeNull();
    });

    it('при клик извиква onBack', () => {
        const onBack = vi.fn();
        const state = makeFullState();
        const el = renderStepPreview(state, onBack);
        const backBtn = el.querySelector('[data-action="back"]');
        backBtn.click();
        expect(onBack).toHaveBeenCalled();
    });
});
