// Стъпка 14 — stepQuestionsView.js
// Стъпка 3 от wizard-а: добавяне и редактиране на въпроси.
// Всички state helper функции са чисти (immutable) и са export-нати за тестване.

import { buildQuestionCard } from '../../templates/questionTemplate.js';

// ---------------------------------------------------------------------------
// Генерира временен уникален ID (замества се с UUID от backend при запис)
// ---------------------------------------------------------------------------
function nextId(prefix) {
    return `${prefix}-${crypto.randomUUID()}`;
}

// ---------------------------------------------------------------------------
// Чисти функции за управление на state (immutable)
// ---------------------------------------------------------------------------

// Добавя нов празен въпрос
export function addQuestion(state) {
    const newQuestion = {
        id: nextId('q'),
        text: '',
        answers: [
            { id: nextId('a'), text: '', isCorrect: false },
            { id: nextId('a'), text: '', isCorrect: false },
        ],
    };
    return { ...state, questions: [...state.questions, newQuestion] };
}

// Премахва въпрос по id
export function removeQuestion(state, questionId) {
    return {
        ...state,
        questions: state.questions.filter(q => q.id !== questionId),
    };
}

// Обновява текста на въпрос
export function updateQuestionText(state, questionId, text) {
    return {
        ...state,
        questions: state.questions.map(q =>
            q.id === questionId ? { ...q, text } : q
        ),
    };
}

// Добавя нов отговор към въпрос
export function addAnswer(state, questionId) {
    const newAnswer = { id: nextId('a'), text: '', isCorrect: false };
    return {
        ...state,
        questions: state.questions.map(q =>
            q.id === questionId
                ? { ...q, answers: [...q.answers, newAnswer] }
                : q
        ),
    };
}

// Премахва отговор от въпрос
export function removeAnswer(state, questionId, answerId) {
    return {
        ...state,
        questions: state.questions.map(q =>
            q.id === questionId
                ? { ...q, answers: q.answers.filter(a => a.id !== answerId) }
                : q
        ),
    };
}

// Обновява текста на отговор
export function updateAnswerText(state, questionId, answerId, text) {
    return {
        ...state,
        questions: state.questions.map(q =>
            q.id === questionId
                ? {
                    ...q,
                    answers: q.answers.map(a =>
                        a.id === answerId ? { ...a, text } : a
                    ),
                }
                : q
        ),
    };
}

// Задава верния отговор — само 1 е верен (single choice)
export function setCorrectAnswer(state, questionId, answerId) {
    return {
        ...state,
        questions: state.questions.map(q =>
            q.id === questionId
                ? {
                    ...q,
                    answers: q.answers.map(a => ({
                        ...a,
                        isCorrect: a.id === answerId,
                    })),
                }
                : q
        ),
    };
}

// ---------------------------------------------------------------------------
// validateStep3 — валидиране на Стъпка 3
//
// @param {object} state — wizard state с масив questions
// @returns {{ valid: boolean, errors: string[] }}
// ---------------------------------------------------------------------------
export function validateStep3(state) {
    const errors = [];

    if (!state.questions || state.questions.length === 0) {
        errors.push('Добавете поне 1 въпрос.');
        return { valid: false, errors };
    }

    state.questions.forEach((q, qi) => {
        const qNum = qi + 1;

        if (!q.text || q.text.trim().length === 0) {
            errors.push(`Въпрос ${qNum}: текстът е задължителен.`);
        }

        if (!q.answers || q.answers.length < 2) {
            errors.push(`Въпрос ${qNum}: трябват поне 2 отговора.`);
        } else if (q.answers.length > 4) {
            errors.push(`Въпрос ${qNum}: максимум 4 отговора.`);
        } else {
            // Проверка на текстовете на отговорите
            q.answers.forEach((a, ai) => {
                if (!a.text || a.text.trim().length === 0) {
                    errors.push(`Въпрос ${qNum}, отговор ${ai + 1}: текстът е задължителен.`);
                }
            });

            // Проверка на верните отговори — точно 1
            const correctCount = q.answers.filter(a => a.isCorrect).length;
            if (correctCount !== 1) {
                errors.push(`Въпрос ${qNum}: трябва точно 1 верен отговор.`);
            }
        }
    });

    return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// renderStepQuestions — рендира DOM за Стъпка 3
//
// @param {object}   state         — wizard state
// @param {function} onStateChange — callback(newState) при промяна
// @param {string[]} errors        — масив с грешки (по подразбиране [])
// @returns {HTMLElement}
// ---------------------------------------------------------------------------
export function renderStepQuestions(state, onStateChange, errors = []) {
    const container = document.createElement('div');
    container.className = 'step-content step-questions';

    // Заглавие
    const heading = document.createElement('h2');
    heading.textContent = 'Въпроси и отговори';
    container.appendChild(heading);

    // Карти за всеки въпрос
    const questionsList = document.createElement('div');
    questionsList.className = 'questions-list';

    state.questions.forEach((question, index) => {
        const card = buildQuestionCard(question, index, {
            onChange: (patch) => onStateChange(applyPatch(state, patch)),
            onRemove: (questionId) => onStateChange(removeQuestion(state, questionId)),
        });
        questionsList.appendChild(card);
    });

    container.appendChild(questionsList);

    // Бутон "Добави въпрос"
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-secondary';
    addBtn.dataset.action = 'add-question';
    addBtn.textContent = 'Добави въпрос';
    addBtn.addEventListener('click', () => onStateChange(addQuestion(state)));

    container.appendChild(addBtn);

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

// ---------------------------------------------------------------------------
// applyPatch — прилага промяна от questionCard callbacks
// ---------------------------------------------------------------------------
function applyPatch(state, patch) {
    switch (patch.type) {
        case 'update-question-text':
            return updateQuestionText(state, patch.questionId, patch.text);
        case 'add-answer':
            return addAnswer(state, patch.questionId);
        case 'remove-answer':
            return removeAnswer(state, patch.questionId, patch.answerId);
        case 'update-answer-text':
            return updateAnswerText(state, patch.questionId, patch.answerId, patch.text);
        case 'set-correct-answer':
            return setCorrectAnswer(state, patch.questionId, patch.answerId);
        default:
            return state;
    }
}
