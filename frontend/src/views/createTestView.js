// Стъпка 11 — createTestView.js
// Главен wizard controller за създаване на тест.
// Управлява 4-стъпков wizard с immutable state.

import { renderStepTitle, validateStep1 } from './wizard/stepTitleView.js';
import { renderStepCategories, validateStep2 } from './wizard/stepCategoriesView.js';
import { renderStepQuestions, validateStep3, addQuestion } from './wizard/stepQuestionsView.js';
import { renderStepPreview } from './wizard/stepPreviewView.js';

// ---------------------------------------------------------------------------
// Начален state на wizard-а
// ---------------------------------------------------------------------------
function createInitialState() {
    return {
        currentStep: 0,
        title: '',
        description: '',
        categoryIds: [],
        questions: [],
    };
}

// ---------------------------------------------------------------------------
// showCreateTest — entry point от routes.js
//
// @param {object} ctx — page.js context обект
// ---------------------------------------------------------------------------
export function showCreateTest(ctx) {
    // Ignore ctx за момента — ще се използва при edit режим в Седмица 6
    void ctx;

    const main = document.getElementById('main');
    main.className = '';

    let state = createInitialState();

    // Рендира wizard-а с текущия state
    function render(errors = []) {
        main.replaceChildren(buildWizardLayout(state, errors, onStateChange, onNext, onBack));
    }

    // Callback при промяна на state от стъпките
    function onStateChange(newState) {
        state = newState;
        render();
    }

    // Callback "Напред" — валидира и преминава към следващата стъпка
    function onNext() {
        const { valid, errors } = validateCurrentStep(state);
        if (!valid) {
            render(errors);
            return;
        }
        state = { ...state, currentStep: state.currentStep + 1 };
        render();
    }

    // Callback "Назад" — връща се към предишната стъпка
    function onBack() {
        if (state.currentStep > 0) {
            state = { ...state, currentStep: state.currentStep - 1 };
            render();
        }
    }

    render();
}

// ---------------------------------------------------------------------------
// validateCurrentStep — делегира към съответния validator
// ---------------------------------------------------------------------------
function validateCurrentStep(state) {
    switch (state.currentStep) {
        case 0: return validateStep1(state);
        case 1: return validateStep2(state);
        case 2: return validateStep3(state);
        default: return { valid: true, errors: [] };
    }
}

// ---------------------------------------------------------------------------
// buildWizardLayout — строи целия wizard layout
// ---------------------------------------------------------------------------
function buildWizardLayout(state, errors, onStateChange, onNext, onBack) {
    const wrapper = document.createElement('div');
    wrapper.className = 'wizard-wrapper';

    // Stepper индикатор
    wrapper.appendChild(buildStepper(state.currentStep));

    // Съдържание на текущата стъпка
    const stepContent = buildStepContent(state, errors, onStateChange);
    wrapper.appendChild(stepContent);

    // Навигационни бутони
    wrapper.appendChild(buildNavButtons(state, onNext, onBack));

    return wrapper;
}

// ---------------------------------------------------------------------------
// buildStepper — DOM индикатор за 4-те стъпки
// ---------------------------------------------------------------------------
function buildStepper(currentStep) {
    const STEPS = [
        'Заглавие',
        'Категории',
        'Въпроси',
        'Преглед',
    ];

    const stepper = document.createElement('div');
    stepper.className = 'wizard-stepper';

    STEPS.forEach((label, index) => {
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

// ---------------------------------------------------------------------------
// buildStepContent — рендира съдържанието на текущата стъпка
// ---------------------------------------------------------------------------
function buildStepContent(state, errors, onStateChange) {
    switch (state.currentStep) {
        case 0:
            return renderStepTitle(state, onStateChange, errors);
        case 1:
            return renderStepCategories(state, onStateChange, errors);
        case 2:
            return renderStepQuestions(state, onStateChange, errors);
        case 3:
            // Стъпка 4 управлява собствения си "Назад"
            return renderStepPreview(state, () => {
                onStateChange({ ...state, currentStep: 2 });
            });
        default:
            return document.createElement('div');
    }
}

// ---------------------------------------------------------------------------
// buildNavButtons — бутони "Назад" и "Напред" (без последната стъпка)
// ---------------------------------------------------------------------------
function buildNavButtons(state, onNext, onBack) {
    // На последната стъпка бутоните се управляват от stepPreviewView
    if (state.currentStep === 3) {
        return document.createElement('div');
    }

    const bar = document.createElement('div');
    bar.className = 'wizard-nav';

    // "Назад" — само от Стъпка 2 нататък
    if (state.currentStep > 0) {
        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'btn btn-secondary';
        backBtn.dataset.action = 'back';
        backBtn.textContent = 'Назад';
        backBtn.addEventListener('click', onBack);
        bar.appendChild(backBtn);
    }

    // "Напред"
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'btn btn-primary';
    nextBtn.dataset.action = 'next';
    nextBtn.textContent = 'Напред';
    nextBtn.addEventListener('click', onNext);
    bar.appendChild(nextBtn);

    return bar;
}
