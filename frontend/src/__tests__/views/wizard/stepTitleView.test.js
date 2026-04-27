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
// validateStep1 — durationMinutes валидация
// ---------------------------------------------------------------------------

describe('validateStep1 — durationMinutes валидация', () => {
    const validBase = { title: 'Тест за JS', description: 'Описание поне десет символа' };

    it('грешка при durationMinutes: 0', () => {
        const result = validateStep1({ ...validBase, durationMinutes: 0 });
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.toLowerCase().includes('продълж'))).toBe(true);
    });

    it('грешка при отрицателна durationMinutes', () => {
        const result = validateStep1({ ...validBase, durationMinutes: -5 });
        expect(result.valid).toBe(false);
    });

    it('грешка при durationMinutes: NaN', () => {
        const result = validateStep1({ ...validBase, durationMinutes: NaN });
        expect(result.valid).toBe(false);
    });

    it('грешка при durationMinutes: "" (празен стринг)', () => {
        const result = validateStep1({ ...validBase, durationMinutes: '' });
        expect(result.valid).toBe(false);
    });

    it('валидно при durationMinutes: 1 (минимум)', () => {
        const result = validateStep1({ ...validBase, durationMinutes: 1 });
        expect(result.valid).toBe(true);
    });

    it('валидно при durationMinutes: 30 (по подразбиране)', () => {
        const result = validateStep1({ ...validBase, durationMinutes: 30 });
        expect(result.valid).toBe(true);
    });

    it('валидно при durationMinutes: 480 (максимум)', () => {
        const result = validateStep1({ ...validBase, durationMinutes: 480 });
        expect(result.valid).toBe(true);
    });

    it('грешка при durationMinutes: 481 (над максимум)', () => {
        const result = validateStep1({ ...validBase, durationMinutes: 481 });
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.toLowerCase().includes('продълж'))).toBe(true);
    });

    it('грешка при дробна durationMinutes: 1.5 (не е цяло число)', () => {
        const result = validateStep1({ ...validBase, durationMinutes: 1.5 });
        expect(result.valid).toBe(false);
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

describe('renderStepTitle — поле за продължителност', () => {
    it('рендира input с id="test-duration"', () => {
        const state = { title: '', description: '', durationMinutes: 30 };
        const el = renderStepTitle(state, vi.fn());
        const input = el.querySelector('#test-duration');
        expect(input).not.toBeNull();
    });

    it('input има type="number"', () => {
        const state = { title: '', description: '', durationMinutes: 30 };
        const el = renderStepTitle(state, vi.fn());
        const input = el.querySelector('#test-duration');
        expect(input.type).toBe('number');
    });

    it('input има min="1"', () => {
        const state = { title: '', description: '', durationMinutes: 30 };
        const el = renderStepTitle(state, vi.fn());
        const input = el.querySelector('#test-duration');
        expect(input.min).toBe('1');
    });

    it('input има max="480"', () => {
        const state = { title: '', description: '', durationMinutes: 30 };
        const el = renderStepTitle(state, vi.fn());
        const input = el.querySelector('#test-duration');
        expect(input.max).toBe('480');
    });

    it('попълва стойността на durationMinutes от state', () => {
        const state = { title: '', description: '', durationMinutes: 45 };
        const el = renderStepTitle(state, vi.fn());
        const input = el.querySelector('#test-duration');
        expect(Number(input.value)).toBe(45);
    });

    it('по подразбиране стойността е 30', () => {
        const state = { title: '', description: '', durationMinutes: 30 };
        const el = renderStepTitle(state, vi.fn());
        const input = el.querySelector('#test-duration');
        expect(Number(input.value)).toBe(30);
    });

    it('промяна на input извиква onStateChange с новата durationMinutes', () => {
        const onStateChange = vi.fn();
        const state = { title: '', description: '', durationMinutes: 30 };
        const el = renderStepTitle(state, onStateChange);
        const input = el.querySelector('#test-duration');
        input.value = '45';
        input.dispatchEvent(new Event('input'));
        const newState = onStateChange.mock.calls[0][0];
        expect(newState.durationMinutes).toBe(45);
    });

    it('промяна не мутира оригиналния state', () => {
        const onStateChange = vi.fn();
        const state = { title: '', description: '', durationMinutes: 30 };
        const el = renderStepTitle(state, onStateChange);
        const input = el.querySelector('#test-duration');
        input.value = '60';
        input.dispatchEvent(new Event('input'));
        expect(state.durationMinutes).toBe(30);
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

// ---------------------------------------------------------------------------
// renderStepTitle — TargetClass dropdown
// ---------------------------------------------------------------------------

describe('renderStepTitle — TargetClass dropdown (Commit 1)', () => {
    it('не рендира dropdown когато classes е празен масив', () => {
        const state = { title: 'Тест', description: 'Описание', targetClass: null };
        const el = renderStepTitle(state, vi.fn(), [], []);
        const select = el.querySelector('#test-target-class');
        // При празни класове — или няма select, или е disabled
        if (select) {
            expect(select.disabled).toBe(true);
        } else {
            expect(select).toBeNull();
        }
    });

    it('рендира dropdown с опциите когато classes не е празен', () => {
        const state = { title: 'Тест', description: 'Описание', targetClass: null };
        const classes = ['9А', '9Б', '10А'];
        const el = renderStepTitle(state, vi.fn(), [], classes);
        const select = el.querySelector('#test-target-class');
        expect(select).not.toBeNull();
        expect(select.disabled).toBe(false);
        // Проверяваме дали опциите са налице
        const options = Array.from(select.options).map(o => o.value);
        expect(options).toContain('9А');
        expect(options).toContain('10А');
    });

    it('предварително избира targetClass от state', () => {
        const state = { title: 'Тест', description: 'Описание', targetClass: '9Б' };
        const classes = ['9А', '9Б', '10А'];
        const el = renderStepTitle(state, vi.fn(), [], classes);
        const select = el.querySelector('#test-target-class');
        expect(select).not.toBeNull();
        expect(select.value).toBe('9Б');
    });

    it('промяна на dropdown извиква onStateChange с новия targetClass (immutable)', () => {
        const onStateChange = vi.fn();
        const state = { title: 'Тест', description: 'Описание', targetClass: null };
        const classes = ['9А', '9Б'];
        const el = renderStepTitle(state, onStateChange, [], classes);
        const select = el.querySelector('#test-target-class');
        select.value = '9А';
        select.dispatchEvent(new Event('change'));
        expect(onStateChange).toHaveBeenCalled();
        const newState = onStateChange.mock.calls[0][0];
        expect(newState).not.toBe(state); // immutable
        expect(newState.targetClass).toBe('9А');
    });
});
