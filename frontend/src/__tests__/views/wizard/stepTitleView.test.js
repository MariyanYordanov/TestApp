// Тестове за views/wizard/stepTitleView.js

const { renderStepTitle, validateStep1 } = await import('../../../views/wizard/stepTitleView.js');

// ---------------------------------------------------------------------------
// validateStep1
// ---------------------------------------------------------------------------

describe('validateStep1 — валидация на заглавие и описание', () => {
    it('връща valid:true при коректни данни', () => {
        const state = { title: 'Тест за JS', description: 'Описание поне десет символа' };
        const result = validateStep1(state);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('грешка когато заглавието е празно', () => {
        const state = { title: '', description: 'Описание поне десет символа' };
        const result = validateStep1(state);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('грешка когато заглавието е под 3 символа', () => {
        const state = { title: 'AB', description: 'Описание поне десет символа' };
        const result = validateStep1(state);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.toLowerCase().includes('загла'))).toBe(true);
    });

    it('точно 3 символа е валидно заглавие', () => {
        const state = { title: 'ABC', description: 'Описание поне десет символа' };
        const result = validateStep1(state);
        expect(result.valid).toBe(true);
    });

    it('грешка когато описанието е празно', () => {
        const state = { title: 'Тест за JS', description: '' };
        const result = validateStep1(state);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('грешка когато описанието е под 10 символа', () => {
        const state = { title: 'Тест за JS', description: 'Кратко' };
        const result = validateStep1(state);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.toLowerCase().includes('описание'))).toBe(true);
    });

    it('точно 10 символа е валидно описание', () => {
        const state = { title: 'Тест за JS', description: '1234567890' };
        const result = validateStep1(state);
        expect(result.valid).toBe(true);
    });

    it('показва грешки за двете полета едновременно', () => {
        const state = { title: '', description: '' };
        const result = validateStep1(state);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
});

// ---------------------------------------------------------------------------
// renderStepTitle — DOM рендиране
// ---------------------------------------------------------------------------

describe('renderStepTitle — структура', () => {
    it('връща DOM елемент', () => {
        const state = { title: '', description: '' };
        const el = renderStepTitle(state, vi.fn());
        expect(el).toBeInstanceOf(HTMLElement);
    });

    it('рендира поле за заглавие', () => {
        const state = { title: '', description: '' };
        const el = renderStepTitle(state, vi.fn());
        const input = el.querySelector('#test-title');
        expect(input).not.toBeNull();
    });

    it('попълва стойността на заглавието', () => {
        const state = { title: 'Моят тест', description: '' };
        const el = renderStepTitle(state, vi.fn());
        const input = el.querySelector('#test-title');
        expect(input.value).toBe('Моят тест');
    });

    it('рендира поле за описание', () => {
        const state = { title: '', description: '' };
        const el = renderStepTitle(state, vi.fn());
        const textarea = el.querySelector('#test-description');
        expect(textarea).not.toBeNull();
    });

    it('попълва стойността на описанието', () => {
        const state = { title: '', description: 'Моето описание тук' };
        const el = renderStepTitle(state, vi.fn());
        const textarea = el.querySelector('#test-description');
        expect(textarea.value).toBe('Моето описание тук');
    });
});

describe('renderStepTitle — callbacks при промяна', () => {
    it('извиква onStateChange при промяна на заглавието', () => {
        const onStateChange = vi.fn();
        const state = { title: '', description: '' };
        const el = renderStepTitle(state, onStateChange);
        const input = el.querySelector('#test-title');
        input.value = 'Нов тест';
        input.dispatchEvent(new Event('input'));
        expect(onStateChange).toHaveBeenCalled();
    });

    it('извиква onStateChange с нов state (immutable) при промяна на заглавие', () => {
        const onStateChange = vi.fn();
        const state = { title: 'Стара стойност', description: '' };
        const el = renderStepTitle(state, onStateChange);
        const input = el.querySelector('#test-title');
        input.value = 'Нова стойност';
        input.dispatchEvent(new Event('input'));
        const newState = onStateChange.mock.calls[0][0];
        expect(newState).not.toBe(state);
        expect(newState.title).toBe('Нова стойност');
    });

    it('извиква onStateChange при промяна на описанието', () => {
        const onStateChange = vi.fn();
        const state = { title: '', description: '' };
        const el = renderStepTitle(state, onStateChange);
        const textarea = el.querySelector('#test-description');
        textarea.value = 'Ново описание тук!';
        textarea.dispatchEvent(new Event('input'));
        expect(onStateChange).toHaveBeenCalled();
    });

    it('не мутира оригиналния state при промяна на заглавие', () => {
        const onStateChange = vi.fn();
        const state = { title: 'Оригинал', description: '' };
        const el = renderStepTitle(state, onStateChange);
        const input = el.querySelector('#test-title');
        input.value = 'Нова стойност';
        input.dispatchEvent(new Event('input'));
        expect(state.title).toBe('Оригинал');
    });
});

describe('renderStepTitle — показване на грешки', () => {
    it('показва грешки когато са подадени', () => {
        const state = { title: 'AB', description: '' };
        const errors = ['Заглавието трябва да е поне 3 символа', 'Описанието е задължително'];
        const el = renderStepTitle(state, vi.fn(), errors);
        const errorEls = el.querySelectorAll('.form-error');
        expect(errorEls.length).toBeGreaterThan(0);
    });

    it('показва грешките като текст', () => {
        const state = { title: '', description: '' };
        const errors = ['Заглавието е задължително'];
        const el = renderStepTitle(state, vi.fn(), errors);
        expect(el.textContent).toContain('Заглавието е задължително');
    });

    it('не показва form-error елементи при липса на грешки', () => {
        const state = { title: 'Тест за JS', description: 'Описание поне десет символа' };
        const el = renderStepTitle(state, vi.fn(), []);
        const errorEls = el.querySelectorAll('.form-error');
        expect(errorEls.length).toBe(0);
    });
});
