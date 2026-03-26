// Стъпка 42 — createTestView.js
// Главен wizard controller за създаване/редактиране на тест.
// Управлява 4-стъпков wizard с immutable state.
// Зарежда категории от API при инициализация.
// При edit режим (/tests/:id/edit) зарежда съществуващия тест.

import page from '../../lib/page.min.js';
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

// Маппинг от API отговор към wizard state
function mapTestToState(test) {
    return {
        currentStep: 0,
        title: test.title ?? '',
        description: test.description ?? '',
        categoryIds: Array.isArray(test.categories)
            ? test.categories.map(c => c.id)
            : (test.categoryIds ?? []),
        questions: Array.isArray(test.questions)
            ? test.questions.map(q => ({
                id: q.id,
                text: q.text ?? '',
                type: q.type ?? 'Closed',
                sampleAnswer: q.sampleAnswer || undefined,
                answers: Array.isArray(q.answers)
                    ? q.answers.map(a => ({
                        id: a.id,
                        text: a.text ?? '',
                        isCorrect: a.isCorrect ?? false,
                    }))
                    : [],
            }))
            : [],
    };
}

// ---------------------------------------------------------------------------
// saveFocus / restoreFocus — запазва и възстановява фокуса след re-render.
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
        if (el.dataset.sampleAnswerFor) {
            // Примерен отговор textarea — има уникален data атрибут
            focus.selector = `[data-sample-answer-for="${el.dataset.sampleAnswerFor}"]`;
        } else {
            // Текст на въпроса textarea
            focus.selector = `[data-question-id="${questionCard.dataset.questionId}"] textarea:not([data-sample-answer-for])`;
        }
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
// ---------------------------------------------------------------------------
export async function showCreateTest(ctx) {
    const editId = ctx?.params?.id ?? null;

    const main = document.getElementById('main');
    main.className = '';

    // Зареждаме категориите и (при edit) съществуващия тест
    let categories = [];
    let existingTest = null;

    const loadCategories = categoryService.getCategories()
        .then(r => { categories = r ?? []; })
        .catch(() => {
            categories = [];
            showToast('Категориите не могат да бъдат заредени.', 'error');
        });

    const loadTest = editId
        ? testService.getFullTest(editId)
            .then(t => { existingTest = t; })
            .catch(() => {
                showToast('Тестът не може да бъде зареден.', 'error');
            })
        : Promise.resolve();

    await Promise.all([loadCategories, loadTest]);

    let state = existingTest
        ? mapTestToState(existingTest)
        : createInitialState();

    function render(errors = []) {
        const focus = saveFocus();
        main.replaceChildren(
            buildWizardLayout(state, errors, onStateChange, onNext, onBack, categories, editId)
        );
        restoreFocus(focus);
    }

    function onStateChange(newState) {
        state = newState;
        render();
    }

    function onNext() {
        const { valid, errors } = validateCurrentStep(state);
        if (!valid) {
            render(errors);
            return;
        }
        state = { ...state, currentStep: state.currentStep + 1 };
        render();
    }

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
function buildWizardLayout(state, errors, onStateChange, onNext, onBack, categories, editId) {
    const wrapper = document.createElement('div');
    wrapper.className = 'wizard-wrapper';

    wrapper.appendChild(buildStepper(state.currentStep));

    const stepContent = buildStepContent(state, errors, onStateChange, categories, editId);
    wrapper.appendChild(stepContent);

    wrapper.appendChild(buildNavButtons(state, onNext, onBack, editId));

    return wrapper;
}

// ---------------------------------------------------------------------------
// buildStepContent — рендира съдържанието на текущата стъпка
// ---------------------------------------------------------------------------
function buildStepContent(state, errors, onStateChange, categories, editId) {
    async function onSave(currentState) {
        if (editId) {
            return testService.updateTest(editId, currentState);
        }
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
            return renderStepPreview(
                state,
                () => { onStateChange({ ...state, currentStep: 2 }); },
                categories,
                onSave,
                editId,
            );
        default:
            return document.createElement('div');
    }
}

// ---------------------------------------------------------------------------
// buildNavButtons — бутони "Назад", "Напред" и "Откажи"
// ---------------------------------------------------------------------------
function buildNavButtons(state, onNext, onBack, editId) {
    // На последната стъпка бутоните се управляват от stepPreviewView
    if (state.currentStep === 3) {
        return document.createElement('div');
    }

    const bar = document.createElement('div');
    bar.className = 'wizard-nav';

    // "Откажи" — вляво, отива към dashboard или детайлите на теста
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.dataset.action = 'cancel';
    cancelBtn.textContent = 'Откажи';
    cancelBtn.addEventListener('click', () => {
        page.redirect(editId ? `/tests/${editId}` : '/dashboard');
    });
    bar.appendChild(cancelBtn);

    // Дясна група: Назад + Напред
    const rightGroup = document.createElement('div');
    rightGroup.className = 'wizard-nav-right';

    if (state.currentStep > 0) {
        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'btn btn-secondary';
        backBtn.dataset.action = 'back';
        backBtn.textContent = 'Назад';
        backBtn.addEventListener('click', onBack);
        rightGroup.appendChild(backBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'btn btn-primary';
    nextBtn.dataset.action = 'next';
    nextBtn.textContent = 'Напред';
    nextBtn.addEventListener('click', onNext);
    rightGroup.appendChild(nextBtn);

    bar.appendChild(rightGroup);

    return bar;
}
