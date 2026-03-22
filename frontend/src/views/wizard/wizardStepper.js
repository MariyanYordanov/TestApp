// Стъпка 42 — wizardStepper.js
// DOM builder за stepper индикатора на wizard-а.
// Извлечен от createTestView.js за спазване на ограничението <200 реда.

const STEP_LABELS = [
    'Заглавие',
    'Категории',
    'Въпроси',
    'Преглед',
];

// ---------------------------------------------------------------------------
// buildStepper — строи DOM индикатора с 4-те стъпки
//
// @param {number} currentStep — индекс на активната стъпка (0-based)
// @returns {HTMLElement}
// ---------------------------------------------------------------------------
export function buildStepper(currentStep) {
    const stepper = document.createElement('div');
    stepper.className = 'wizard-stepper';

    STEP_LABELS.forEach((label, index) => {
        const step = document.createElement('div');
        step.className = `stepper-step${index === currentStep ? ' active' : ''}`;
        step.dataset.step = String(index);

        const number = document.createElement('span');
        number.className = 'step-number';
        number.textContent = String(index + 1);

        const text = document.createElement('span');
        text.className = 'step-label';
        text.textContent = label;

        step.appendChild(number);
        step.appendChild(text);
        stepper.appendChild(step);
    });

    return stepper;
}
