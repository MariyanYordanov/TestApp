// Стъпка 14 — stepQuestionsView.js
// Стъпка 3 от wizard-а: добавяне и редактиране на въпроси.
// Поддържа три типа: Closed (радио), Multi (checkbox), Open (текст).
// Всички state helper функции са чисти (immutable) и са export-нати за тестване.

import { buildQuestionCard } from '../../templates/questionTemplate.js';

// ---------------------------------------------------------------------------
// Генерира временен уникален ID
// ---------------------------------------------------------------------------
function nextId(prefix) {
    return `${prefix}-${crypto.randomUUID()}`;
}

// ---------------------------------------------------------------------------
// Чисти функции за управление на state (immutable)
// ---------------------------------------------------------------------------

// Изчислява точките по подразбиране спрямо типа въпрос и броя отговори
// Closed: ceil(answerCount / 2), Multi: answerCount (min 1), Open: 3, Code: 4
export function getDefaultPoints(questionType, answerCount) {
    if (questionType === 'Open') return 3;
    if (questionType === 'Code') return 4;
    if (questionType === 'Multi') return Math.max(1, answerCount);
    // Closed
    return Math.max(1, Math.ceil(answerCount / 2));
}

// Добавя нов празен въпрос (тип Closed по подразбиране)
export function addQuestion(state) {
    const defaultAnswerCount = 2;
    const newQuestion = {
        id: nextId('q'),
        text: '',
        type: 'Closed',
        points: getDefaultPoints('Closed', defaultAnswerCount),
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

// Обновява типа на въпрос.
// При преминаване от Open към Closed/Multi добавя 2 празни отговора ако няма.
// При преминаване към Closed нулира isCorrect флаговете (само 1 е верен).
// Автоматично обновява points при смяна на тип.
export function updateQuestionType(state, questionId, questionType) {
    return {
        ...state,
        questions: state.questions.map(q => {
            if (q.id !== questionId) return q;

            let answers = q.answers;

            // Ако минаваме към Open/Code — изтриваме отговорите (тип без отговори)
            // Ако минаваме от Open/Code към Closed/Multi и нямаме отговори — добавяме 2 празни
            const isOpenLike = questionType === 'Open' || questionType === 'Code';
            if (isOpenLike) {
                answers = [];
            } else if (answers.length === 0) {
                answers = [
                    { id: nextId('a'), text: '', isCorrect: false },
                    { id: nextId('a'), text: '', isCorrect: false },
                ];
            }

            // При Closed: нулираме всички isCorrect (трябва точно 1 да се избере)
            if (questionType === 'Closed') {
                answers = answers.map(a => ({ ...a, isCorrect: false }));
            }

            // При преминаване от Open/Code към Closed/Multi — изчистваме sampleAnswer
            const sampleAnswer = isOpenLike ? q.sampleAnswer : undefined;

            // Автоматично изчисляваме points за новия тип и брой отговори
            const points = getDefaultPoints(questionType, answers.length);

            return { ...q, type: questionType, points, answers, sampleAnswer };
        }),
    };
}

// Обновява точките на въпрос (immutable)
export function updateQuestionPoints(state, questionId, points) {
    return {
        ...state,
        questions: state.questions.map(q =>
            q.id === questionId ? { ...q, points } : q
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

// Обновява примерния отговор на Open/Code въпрос
export function updateSampleAnswer(state, questionId, sampleAnswer) {
    return {
        ...state,
        questions: state.questions.map(q =>
            q.id === questionId ? { ...q, sampleAnswer } : q
        ),
    };
}

// Задава верния отговор — само 1 е верен (Closed)
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

// Превключва верен/неверен за Multi тип
export function toggleCorrectAnswer(state, questionId, answerId) {
    return {
        ...state,
        questions: state.questions.map(q =>
            q.id === questionId
                ? {
                    ...q,
                    answers: q.answers.map(a =>
                        a.id === answerId ? { ...a, isCorrect: !a.isCorrect } : a
                    ),
                }
                : q
        ),
    };
}

// ---------------------------------------------------------------------------
// validateStep3 — валидиране на Стъпка 3
// ---------------------------------------------------------------------------
export function validateStep3(state) {
    const errors = [];

    if (!state.questions || state.questions.length === 0) {
        errors.push('Добавете поне 1 въпрос.');
        return { valid: false, errors };
    }

    state.questions.forEach((q, qi) => {
        const qNum = qi + 1;
        const qType = q.type ?? 'Closed';

        if (!q.text || q.text.trim().length === 0) {
            errors.push(`Въпрос ${qNum}: текстът е задължителен.`);
        }

        // Open и Code въпросите нямат отговори — проверяваме само sampleAnswer и пропускаме проверката на отговорите
        if (qType === 'Open' || qType === 'Code') {
            const maxLen = qType === 'Code' ? 50000 : 10000;
            if (q.sampleAnswer && q.sampleAnswer.length > maxLen) {
                errors.push(`Въпрос ${qNum}: примерният отговор не може да надвишава ${maxLen} символа.`);
            }
            return;
        }

        if (!q.answers || q.answers.length < 2) {
            errors.push(`Въпрос ${qNum}: трябват поне 2 отговора.`);
        } else if (q.answers.length > 4) {
            errors.push(`Въпрос ${qNum}: максимум 4 отговора.`);
        } else {
            q.answers.forEach((a, ai) => {
                if (!a.text || a.text.trim().length === 0) {
                    errors.push(`Въпрос ${qNum}, отговор ${ai + 1}: текстът е задължителен.`);
                }
            });

            const correctCount = q.answers.filter(a => a.isCorrect).length;
            if (qType === 'Closed' && correctCount !== 1) {
                errors.push(`Въпрос ${qNum}: трябва точно 1 верен отговор.`);
            }
            if (qType === 'Multi' && correctCount < 1) {
                errors.push(`Въпрос ${qNum}: изберете поне 1 верен отговор.`);
            }
        }
    });

    return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// renderStepQuestions — рендира DOM за Стъпка 3
// ---------------------------------------------------------------------------
export function renderStepQuestions(state, onStateChange, errors = []) {
    const container = document.createElement('div');
    container.className = 'step-content step-questions';

    const heading = document.createElement('h2');
    heading.textContent = 'Въпроси и отговори';
    container.appendChild(heading);

    const questionsList = document.createElement('div');
    questionsList.className = 'questions-list';

    // Въпроси с празен текст — за inline подчертаване
    const emptyTextIds = new Set(
        errors.some(e => e.includes('текстът е задължителен'))
            ? state.questions.filter(q => !q.text || q.text.trim().length === 0).map(q => q.id)
            : []
    );

    let firstErrorCard = null;

    state.questions.forEach((question, index) => {
        const hasTextError = emptyTextIds.has(question.id);
        const card = buildQuestionCard(question, index, {
            onChange: (patch) => onStateChange(applyPatch(state, patch)),
            onRemove: (questionId) => onStateChange(removeQuestion(state, questionId)),
            hasTextError,
        });
        if (hasTextError && !firstErrorCard) firstErrorCard = card;
        questionsList.appendChild(card);
    });

    container.appendChild(questionsList);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-secondary';
    addBtn.dataset.action = 'add-question';
    addBtn.textContent = '+ Добави въпрос';
    addBtn.addEventListener('click', () => onStateChange(addQuestion(state)));
    container.appendChild(addBtn);

    // Скролира до първия въпрос с грешка след рендиране
    if (firstErrorCard) {
        requestAnimationFrame(() => firstErrorCard.scrollIntoView({ behavior: 'smooth', block: 'center' }));
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
        case 'update-question-type':
            return updateQuestionType(state, patch.questionId, patch.questionType);
        case 'add-answer':
            return addAnswer(state, patch.questionId);
        case 'remove-answer':
            return removeAnswer(state, patch.questionId, patch.answerId);
        case 'update-answer-text':
            return updateAnswerText(state, patch.questionId, patch.answerId, patch.text);
        case 'set-correct-answer':
            return setCorrectAnswer(state, patch.questionId, patch.answerId);
        case 'toggle-correct-answer':
            return toggleCorrectAnswer(state, patch.questionId, patch.answerId);
        case 'update-sample-answer':
            return updateSampleAnswer(state, patch.questionId, patch.sampleAnswer);
        case 'update-question-points':
            return updateQuestionPoints(state, patch.questionId, patch.points);
        default:
            return state;
    }
}
