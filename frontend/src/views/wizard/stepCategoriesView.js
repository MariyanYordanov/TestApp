// Стъпка 43 — stepCategoriesView.js
// Стъпка 2 от wizard-а: избор на категории чрез checkboxes.
// Без innerHTML за потребителски данни — само createElement/textContent.
// Категориите се подават като параметър (заредени от API в createTestView).

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
// @param {Array}    categories    — масив с категории от API (по подразбиране [])
// @returns {HTMLElement}
// ---------------------------------------------------------------------------
export function renderStepCategories(state, onStateChange, errors = [], categories = []) {
    const container = document.createElement('div');
    container.className = 'step-content step-categories';

    // Заглавие на стъпката
    const heading = document.createElement('h2');
    heading.textContent = 'Изберете категории';
    container.appendChild(heading);

    // Списък с checkboxes или съобщение за липса на категории
    const list = document.createElement('div');
    list.className = 'categories-list';

    if (categories.length === 0) {
        // Показваме информативно съобщение при липса на категории
        const emptyMsg = document.createElement('p');
        emptyMsg.className = 'empty-state';
        emptyMsg.textContent = 'Няма налични категории. Добавете категории от менюто.';
        list.appendChild(emptyMsg);
    } else {
        categories.forEach(cat => {
            list.appendChild(buildCategoryCheckbox(cat, state, onStateChange));
        });
    }

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
