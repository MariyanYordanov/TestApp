// Стъпка 13 — stepCategoriesView.js
// Стъпка 2 от wizard-а: избор на категории чрез checkboxes.
// Без innerHTML за потребителски данни — само createElement/textContent.

// ---------------------------------------------------------------------------
// MOCK данни — заменят се с API заявка в Седмица 6
// ---------------------------------------------------------------------------
export const MOCK_CATEGORIES = [
    { id: 'cat-1', name: 'Математика' },
    { id: 'cat-2', name: 'История' },
    { id: 'cat-3', name: 'Биология' },
    { id: 'cat-4', name: 'JavaScript' },
    { id: 'cat-5', name: 'C#' },
];

// ---------------------------------------------------------------------------
// validateStep2 — валидиране на Стъпка 2
//
// @param {object} state — wizard state с поле categoryIds[]
// @returns {{ valid: boolean, errors: string[] }}
// ---------------------------------------------------------------------------
export function validateStep2(state) {
    const errors = [];

    if (!state.categoryIds || state.categoryIds.length === 0) {
        errors.push('Изберете поне 1 категория.');
    }

    return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// renderStepCategories — рендира DOM за Стъпка 2
//
// @param {object}   state         — wizard state
// @param {function} onStateChange — callback(newState) при промяна
// @param {string[]} errors        — масив с грешки (по подразбиране [])
// @returns {HTMLElement}
// ---------------------------------------------------------------------------
export function renderStepCategories(state, onStateChange, errors = []) {
    const container = document.createElement('div');
    container.className = 'step-content step-categories';

    // Заглавие на стъпката
    const heading = document.createElement('h2');
    heading.textContent = 'Изберете категории';
    container.appendChild(heading);

    // Списък с checkboxes
    const list = document.createElement('div');
    list.className = 'categories-list';

    MOCK_CATEGORIES.forEach(cat => {
        list.appendChild(buildCategoryCheckbox(cat, state, onStateChange));
    });

    container.appendChild(list);

    // Грешки
    if (errors.length > 0) {
        errors.forEach(msg => {
            const errEl = document.createElement('p');
            errEl.className = 'form-error';
            errEl.textContent = msg;
            container.appendChild(errEl);
        });
    }

    return container;
}

// Строи checkbox + label за една категория
function buildCategoryCheckbox(category, state, onStateChange) {
    const currentIds = state.categoryIds ?? [];
    const isChecked = currentIds.includes(category.id);

    const wrapper = document.createElement('div');
    wrapper.className = 'category-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `cat-${category.id}`;
    checkbox.value = category.id;
    checkbox.checked = isChecked;

    checkbox.addEventListener('change', () => {
        const newIds = checkbox.checked
            ? [...currentIds, category.id]
            : currentIds.filter(id => id !== category.id);
        // Immutable — нов обект
        onStateChange({ ...state, categoryIds: newIds });
    });

    const label = document.createElement('label');
    label.htmlFor = `cat-${category.id}`;
    label.textContent = category.name;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);

    return wrapper;
}
