// Стъпка 12 — stepTitleView.js
// Стъпка 1 от wizard-а: заглавие, описание и продължителност на теста.
// Само createElement/textContent — без innerHTML за потребителски данни.

import {
    DURATION_DEFAULT_MINUTES,
    DURATION_MIN_MINUTES,
    DURATION_MAX_MINUTES,
} from '../../config.js';

// ---------------------------------------------------------------------------
// validateStep1 — валидиране на Стъпка 1
//
// @param {object} state — wizard state с полета title, description, durationMinutes
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

    // Валидира продължителността само ако е изрично зададена в state.
    // undefined означава "не е въведено" — ще се ползва default стойността.
    if ('durationMinutes' in state) {
        const dur = state.durationMinutes;
        const durNum = Number(dur);
        const isInvalid =
            dur === '' ||
            dur === null ||
            Number.isNaN(durNum) ||
            !Number.isInteger(durNum) ||
            durNum < DURATION_MIN_MINUTES ||
            durNum > DURATION_MAX_MINUTES;

        if (isInvalid) {
            errors.push(`Продължителността трябва да е цяло число между ${DURATION_MIN_MINUTES} и ${DURATION_MAX_MINUTES} минути.`);
        }
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
export function renderStepTitle(state, onStateChange, errors = [], classes = []) {
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

    // --- Поле: Продължителност в минути ---
    container.appendChild(buildDurationField(state, onStateChange));

    // --- Поле: Целеви клас (dropdown от students.json) ---
    container.appendChild(buildTargetClassField(state, onStateChange, classes));

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

// Строи поле за продължителност (number input)
function buildDurationField(state, onStateChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-group';

    const labelEl = document.createElement('label');
    labelEl.htmlFor = 'test-duration';
    labelEl.textContent = `Продължителност (минути, ${DURATION_MIN_MINUTES}–${DURATION_MAX_MINUTES})`;

    const inputEl = document.createElement('input');
    inputEl.id = 'test-duration';
    inputEl.className = 'form-input';
    inputEl.type = 'number';
    inputEl.min = String(DURATION_MIN_MINUTES);
    inputEl.max = String(DURATION_MAX_MINUTES);
    inputEl.step = '1';
    inputEl.value = String(state.durationMinutes ?? DURATION_DEFAULT_MINUTES);

    inputEl.addEventListener('input', () => {
        // Конвертира стойността към число (parseInt за да не се допускат дробни)
        const parsed = parseInt(inputEl.value, 10);
        onStateChange({ ...state, durationMinutes: isNaN(parsed) ? '' : parsed });
    });

    wrapper.appendChild(labelEl);
    wrapper.appendChild(inputEl);

    return wrapper;
}

// Строи поле за целеви клас (dropdown — информативно, незадължително)
// При празни classes — показва disabled select
function buildTargetClassField(state, onStateChange, classes) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-group';

    const labelEl = document.createElement('label');
    labelEl.htmlFor = 'test-target-class';
    labelEl.textContent = 'Целеви клас (незадължително)';

    const selectEl = document.createElement('select');
    selectEl.id = 'test-target-class';
    selectEl.className = 'form-input';

    if (!classes || classes.length === 0) {
        selectEl.disabled = true;
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '— няма класове в директорията —';
        selectEl.appendChild(placeholder);
    } else {
        // Placeholder опция
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '— не е избран —';
        selectEl.appendChild(placeholder);

        classes.forEach(cls => {
            const opt = document.createElement('option');
            opt.value = cls;
            opt.textContent = cls;
            selectEl.appendChild(opt);
        });

        // Предварително избира стойността от state
        selectEl.value = state.targetClass ?? '';

        selectEl.addEventListener('change', () => {
            onStateChange({ ...state, targetClass: selectEl.value || null });
        });
    }

    wrapper.appendChild(labelEl);
    wrapper.appendChild(selectEl);

    return wrapper;
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
