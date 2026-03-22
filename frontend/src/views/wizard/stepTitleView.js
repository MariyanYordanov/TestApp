// Стъпка 12 — stepTitleView.js
// Стъпка 1 от wizard-а: заглавие и описание на теста.
// Само createElement/textContent — без innerHTML за потребителски данни.

// ---------------------------------------------------------------------------
// validateStep1 — валидиране на Стъпка 1
//
// @param {object} state — wizard state с полета title и description
// @returns {{ valid: boolean, errors: string[] }}
// ---------------------------------------------------------------------------
export function validateStep1(state) {
    const errors = [];

    if (!state.title || state.title.trim().length === 0) {
        errors.push('Заглавието е задължително.');
    } else if (state.title.trim().length < 3) {
        errors.push('Заглавието трябва да е поне 3 символа.');
    }

    if (!state.description || state.description.trim().length === 0) {
        errors.push('Описанието е задължително.');
    } else if (state.description.trim().length < 10) {
        errors.push('Описанието трябва да е поне 10 символа.');
    }

    return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// renderStepTitle — рендира DOM за Стъпка 1
//
// @param {object}   state         — wizard state
// @param {function} onStateChange — callback(newState) при промяна
// @param {string[]} errors        — масив с грешки (по подразбиране [])
// @returns {HTMLElement}
// ---------------------------------------------------------------------------
export function renderStepTitle(state, onStateChange, errors = []) {
    const container = document.createElement('div');
    container.className = 'step-content step-title';

    // Заглавие на стъпката
    const heading = document.createElement('h2');
    heading.textContent = 'Заглавие и описание';
    container.appendChild(heading);

    // --- Поле: Заглавие ---
    container.appendChild(buildField({
        id: 'test-title',
        label: 'Заглавие на теста',
        tagName: 'input',
        inputType: 'text',
        value: state.title,
        placeholder: 'Въведете заглавие...',
        onInput: (val) => onStateChange({ ...state, title: val }),
    }));

    // --- Поле: Описание ---
    container.appendChild(buildField({
        id: 'test-description',
        label: 'Описание',
        tagName: 'textarea',
        value: state.description,
        placeholder: 'Въведете описание...',
        onInput: (val) => onStateChange({ ...state, description: val }),
    }));

    // --- Грешки ---
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

// Помощна функция — строи label + input/textarea двойка
function buildField({ id, label, tagName, inputType, value, placeholder, onInput }) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-group';

    const labelEl = document.createElement('label');
    labelEl.htmlFor = id;
    labelEl.textContent = label;

    const inputEl = document.createElement(tagName);
    inputEl.id = id;
    inputEl.className = 'form-input';
    inputEl.value = value;
    inputEl.placeholder = placeholder;
    if (inputType) inputEl.type = inputType;

    inputEl.addEventListener('input', () => onInput(inputEl.value));

    wrapper.appendChild(labelEl);
    wrapper.appendChild(inputEl);

    return wrapper;
}
