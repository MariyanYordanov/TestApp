// Стъпка 42 — createTestView.js
// Главен wizard controller за създаване на тест.
// Управлява 4-стъпков wizard с immutable state.
// Зарежда категории от API при инициализация.

import { renderStepTitle, validateStep1 } from './wizard/stepTitleView.js';
import { renderStepCategories, validateStep2 } from './wizard/stepCategoriesView.js';
import { renderStepQuestions, validateStep3 } from './wizard/stepQuestionsView.js';
import { renderStepPreview } from './wizard/stepPreviewView.js';
import { buildStepper } from './wizard/wizardStepper.js';
import * as categoryService from '../services/categoryService.js';
import * as testService from '../services/testService.js';
import { showToast } from '../utils/notification.js';

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
// saveFocus / restoreFocus — запазва и възстановява фокуса след re-render.
// Поддържа: елементи с id, textarea на въпрос, input на отговор.
// ---------------------------------------------------------------------------
function saveFocus() {
    const el = document.activeElement;
    if (!el || el === document.body) return null;

    const focus = { selectionStart: el.selectionStart, selectionEnd: el.selectionEnd };

    if (el.id) {
        focus.selector = `#${el.id}`;
        return focus;
    }

    const answerRow = el.closest('[data-answer-id]');
    const questionCard = el.closest('[data-question-id]');

    if (answerRow && questionCard) {
        focus.selector = `[data-question-id="${questionCard.dataset.questionId}"] [data-answer-id="${answerRow.dataset.answerId}"] input[type="text"]`;
        return focus;
    }

    if (questionCard && el.tagName === 'TEXTAREA') {
        focus.selector = `[data-question-id="${questionCard.dataset.questionId}"] textarea`;
        return focus;
    }

    return null;
}

function restoreFocus(focus) {
    if (!focus?.selector) return;
    const el = document.querySelector(focus.selector);
    if (!el) return;
    el.focus();
    const supportsSelection = el.tagName === 'TEXTAREA' ||
        (el.tagName === 'INPUT' && ['text', 'search', 'url', 'tel', 'password'].includes(el.type));
    if (supportsSelection && focus.selectionStart !== undefined) {
        el.setSelectionRange(focus.selectionStart, focus.selectionEnd);
    }
}

// ---------------------------------------------------------------------------
// showCreateTest — entry point от routes.js
//
// @param {object} ctx — page.js context обект
// ---------------------------------------------------------------------------
export async function showCreateTest(ctx) {
    // Ignore ctx за момента — ще се използва при edit режим
    void ctx;

    const main = document.getElementById('main');
    main.className = '';

    // Зареждаме категориите от API при инициализация на wizard-а
    let categories = [];
    try {
        categories = await categoryService.getCategories() ?? [];
    } catch {
        // При грешка продължаваме с празен масив — потребителят ще види съобщение в Стъпка 2
        categories = [];
        showToast('Категориите не могат да бъдат заредени.', 'error');
    }

    let state = createInitialState();

    // Рендира wizard-а с текущия state, запазвайки фокуса
    function render(errors = []) {
        const focus = saveFocus();
        main.replaceChildren(buildWizardLayout(state, errors, onStateChange, onNext, onBack, categories));
        restoreFocus(focus);
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
function buildWizardLayout(state, errors, onStateChange, onNext, onBack, categories) {
    const wrapper = document.createElement('div');
    wrapper.className = 'wizard-wrapper';

    // Stepper индикатор
    wrapper.appendChild(buildStepper(state.currentStep));

    // Съдържание на текущата стъпка
    const stepContent = buildStepContent(state, errors, onStateChange, categories);
    wrapper.appendChild(stepContent);

    // Навигационни бутони
    wrapper.appendChild(buildNavButtons(state, onNext, onBack));

    return wrapper;
}

// ---------------------------------------------------------------------------
// buildStepContent — рендира съдържанието на текущата стъпка
// ---------------------------------------------------------------------------
function buildStepContent(state, errors, onStateChange, categories) {
    // onSave callback: изпраща теста към API
    async function onSave(currentState) {
        return testService.createTest(currentState);
    }

    switch (state.currentStep) {
        case 0:
            return renderStepTitle(state, onStateChange, errors);
        case 1:
            return renderStepCategories(state, onStateChange, errors, categories);
        case 2:
            return renderStepQuestions(state, onStateChange, errors);
        case 3:
            // Стъпка 4 управлява собствения си "Назад" и запазването
            return renderStepPreview(
                state,
                () => { onStateChange({ ...state, currentStep: 2 }); },
                categories,
                onSave,
            );
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
