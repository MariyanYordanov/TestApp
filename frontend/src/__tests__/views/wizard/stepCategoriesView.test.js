// Тестове за views/wizard/stepCategoriesView.js

const { renderStepCategories, validateStep2, MOCK_CATEGORIES } = await import('../../../views/wizard/stepCategoriesView.js');

// ---------------------------------------------------------------------------
// MOCK_CATEGORIES — константа
// ---------------------------------------------------------------------------

describe('MOCK_CATEGORIES — дефиниция', () => {
    it('е масив', () => {
        expect(Array.isArray(MOCK_CATEGORIES)).toBe(true);
    });

    it('съдържа поне 1 категория', () => {
        expect(MOCK_CATEGORIES.length).toBeGreaterThan(0);
    });

    it('всяка категория има id и name', () => {
        MOCK_CATEGORIES.forEach(cat => {
            expect(cat).toHaveProperty('id');
            expect(cat).toHaveProperty('name');
        });
    });
});

// ---------------------------------------------------------------------------
// validateStep2
// ---------------------------------------------------------------------------

describe('validateStep2 — валидация на категории', () => {
    it('връща valid:true при поне 1 избрана категория', () => {
        const state = { categoryIds: ['cat-1'] };
        const result = validateStep2(state);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('грешка при празен масив категории', () => {
        const state = { categoryIds: [] };
        const result = validateStep2(state);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('valid:true при повече от 1 категория', () => {
        const state = { categoryIds: ['cat-1', 'cat-2', 'cat-3'] };
        const result = validateStep2(state);
        expect(result.valid).toBe(true);
    });

    it('грешката споменава "категория"', () => {
        const state = { categoryIds: [] };
        const result = validateStep2(state);
        expect(result.errors[0].toLowerCase()).toContain('категория');
    });
});

// ---------------------------------------------------------------------------
// renderStepCategories — DOM рендиране
// ---------------------------------------------------------------------------

describe('renderStepCategories — структура', () => {
    it('връща DOM елемент', () => {
        const state = { categoryIds: [] };
        const el = renderStepCategories(state, vi.fn());
        expect(el).toBeInstanceOf(HTMLElement);
    });

    it('рендира checkbox за всяка mock категория', () => {
        const state = { categoryIds: [] };
        const el = renderStepCategories(state, vi.fn());
        const checkboxes = el.querySelectorAll('input[type="checkbox"]');
        expect(checkboxes.length).toBe(MOCK_CATEGORIES.length);
    });

    it('показва имената на категориите', () => {
        const state = { categoryIds: [] };
        const el = renderStepCategories(state, vi.fn());
        MOCK_CATEGORIES.forEach(cat => {
            expect(el.textContent).toContain(cat.name);
        });
    });

    it('checkbox стойностите отговарят на id-тата', () => {
        const state = { categoryIds: [] };
        const el = renderStepCategories(state, vi.fn());
        const checkboxes = el.querySelectorAll('input[type="checkbox"]');
        const values = Array.from(checkboxes).map(cb => cb.value);
        MOCK_CATEGORIES.forEach(cat => {
            expect(values).toContain(cat.id);
        });
    });
});

describe('renderStepCategories — предварително избрани', () => {
    it('маркира избраните категории', () => {
        const state = { categoryIds: ['cat-1', 'cat-3'] };
        const el = renderStepCategories(state, vi.fn());
        const checkboxes = el.querySelectorAll('input[type="checkbox"]');
        const checkedValues = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        expect(checkedValues).toContain('cat-1');
        expect(checkedValues).toContain('cat-3');
    });

    it('не маркира неизбраните категории', () => {
        const state = { categoryIds: ['cat-1'] };
        const el = renderStepCategories(state, vi.fn());
        const checkboxes = el.querySelectorAll('input[type="checkbox"]');
        const cat2Checkbox = Array.from(checkboxes).find(cb => cb.value === 'cat-2');
        expect(cat2Checkbox.checked).toBe(false);
    });
});

describe('renderStepCategories — callbacks при промяна', () => {
    it('onStateChange се извиква при избор на категория', () => {
        const onStateChange = vi.fn();
        const state = { categoryIds: [] };
        const el = renderStepCategories(state, onStateChange);
        const firstCheckbox = el.querySelector('input[type="checkbox"]');
        firstCheckbox.checked = true;
        firstCheckbox.dispatchEvent(new Event('change'));
        expect(onStateChange).toHaveBeenCalled();
    });

    it('добавя категория в нов state (immutable) при отметка', () => {
        const onStateChange = vi.fn();
        const state = { categoryIds: [] };
        const el = renderStepCategories(state, onStateChange);
        const cat1Checkbox = el.querySelector('input[value="cat-1"]');
        cat1Checkbox.checked = true;
        cat1Checkbox.dispatchEvent(new Event('change'));
        const newState = onStateChange.mock.calls[0][0];
        expect(newState).not.toBe(state);
        expect(newState.categoryIds).toContain('cat-1');
    });

    it('премахва категория от нов state при премахване на отметка', () => {
        const onStateChange = vi.fn();
        const state = { categoryIds: ['cat-1', 'cat-2'] };
        const el = renderStepCategories(state, onStateChange);
        const cat1Checkbox = el.querySelector('input[value="cat-1"]');
        cat1Checkbox.checked = false;
        cat1Checkbox.dispatchEvent(new Event('change'));
        const newState = onStateChange.mock.calls[0][0];
        expect(newState.categoryIds).not.toContain('cat-1');
        expect(newState.categoryIds).toContain('cat-2');
    });

    it('не мутира оригиналния state', () => {
        const onStateChange = vi.fn();
        const originalIds = ['cat-2'];
        const state = { categoryIds: originalIds };
        const el = renderStepCategories(state, onStateChange);
        const cat1Checkbox = el.querySelector('input[value="cat-1"]');
        cat1Checkbox.checked = true;
        cat1Checkbox.dispatchEvent(new Event('change'));
        expect(state.categoryIds).toEqual(['cat-2']);
    });
});

describe('renderStepCategories — показване на грешки', () => {
    it('показва грешки когато са подадени', () => {
        const state = { categoryIds: [] };
        const errors = ['Изберете поне 1 категория'];
        const el = renderStepCategories(state, vi.fn(), errors);
        const errorEls = el.querySelectorAll('.form-error');
        expect(errorEls.length).toBeGreaterThan(0);
    });

    it('не показва form-error при липса на грешки', () => {
        const state = { categoryIds: ['cat-1'] };
        const el = renderStepCategories(state, vi.fn(), []);
        const errorEls = el.querySelectorAll('.form-error');
        expect(errorEls.length).toBe(0);
    });
});
