// Тестове за views/wizard/stepQuestionsView.js

const {
    renderStepQuestions,
    validateStep3,
    addQuestion,
    removeQuestion,
    updateQuestionText,
    addAnswer,
    removeAnswer,
    updateAnswerText,
    setCorrectAnswer,
} = await import('../../../views/wizard/stepQuestionsView.js');

// ---------------------------------------------------------------------------
// Помощна функция за начален state
// ---------------------------------------------------------------------------
function makeState(overrides = {}) {
    return {
        questions: [
            {
                id: 'q-1',
                text: 'Какво е JS?',
                answers: [
                    { id: 'a-1', text: 'Програмен език', isCorrect: true },
                    { id: 'a-2', text: 'База данни', isCorrect: false },
                ],
            },
        ],
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// validateStep3
// ---------------------------------------------------------------------------

describe('validateStep3 — валидация на въпроси', () => {
    it('valid:true при 1 коректен въпрос с 2 отговора и 1 верен', () => {
        const state = makeState();
        const result = validateStep3(state);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('грешка при празен масив въпроси', () => {
        const state = makeState({ questions: [] });
        const result = validateStep3(state);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('грешка при въпрос с празен текст', () => {
        const state = makeState({
            questions: [{
                id: 'q-1',
                text: '',
                answers: [
                    { id: 'a-1', text: 'Отговор 1', isCorrect: true },
                    { id: 'a-2', text: 'Отговор 2', isCorrect: false },
                ],
            }],
        });
        const result = validateStep3(state);
        expect(result.valid).toBe(false);
    });

    it('грешка при само 1 отговор', () => {
        const state = makeState({
            questions: [{
                id: 'q-1',
                text: 'Въпрос',
                answers: [
                    { id: 'a-1', text: 'Само един', isCorrect: true },
                ],
            }],
        });
        const result = validateStep3(state);
        expect(result.valid).toBe(false);
    });

    it('грешка при 5 или повече отговора', () => {
        const state = makeState({
            questions: [{
                id: 'q-1',
                text: 'Въпрос',
                answers: [
                    { id: 'a-1', text: 'A1', isCorrect: true },
                    { id: 'a-2', text: 'A2', isCorrect: false },
                    { id: 'a-3', text: 'A3', isCorrect: false },
                    { id: 'a-4', text: 'A4', isCorrect: false },
                    { id: 'a-5', text: 'A5', isCorrect: false },
                ],
            }],
        });
        const result = validateStep3(state);
        expect(result.valid).toBe(false);
    });

    it('valid:true при точно 4 отговора', () => {
        const state = makeState({
            questions: [{
                id: 'q-1',
                text: 'Въпрос',
                answers: [
                    { id: 'a-1', text: 'A1', isCorrect: true },
                    { id: 'a-2', text: 'A2', isCorrect: false },
                    { id: 'a-3', text: 'A3', isCorrect: false },
                    { id: 'a-4', text: 'A4', isCorrect: false },
                ],
            }],
        });
        const result = validateStep3(state);
        expect(result.valid).toBe(true);
    });

    it('грешка при отговор с празен текст', () => {
        const state = makeState({
            questions: [{
                id: 'q-1',
                text: 'Въпрос',
                answers: [
                    { id: 'a-1', text: '', isCorrect: true },
                    { id: 'a-2', text: 'Отговор 2', isCorrect: false },
                ],
            }],
        });
        const result = validateStep3(state);
        expect(result.valid).toBe(false);
    });

    it('грешка при 0 верни отговора', () => {
        const state = makeState({
            questions: [{
                id: 'q-1',
                text: 'Въпрос',
                answers: [
                    { id: 'a-1', text: 'Отговор 1', isCorrect: false },
                    { id: 'a-2', text: 'Отговор 2', isCorrect: false },
                ],
            }],
        });
        const result = validateStep3(state);
        expect(result.valid).toBe(false);
    });

    it('грешка при 2 верни отговора', () => {
        const state = makeState({
            questions: [{
                id: 'q-1',
                text: 'Въпрос',
                answers: [
                    { id: 'a-1', text: 'Отговор 1', isCorrect: true },
                    { id: 'a-2', text: 'Отговор 2', isCorrect: true },
                ],
            }],
        });
        const result = validateStep3(state);
        expect(result.valid).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Чисти immutable функции за управление на state
// ---------------------------------------------------------------------------

describe('addQuestion', () => {
    it('добавя нов въпрос към масива', () => {
        const state = makeState({ questions: [] });
        const newState = addQuestion(state);
        expect(newState.questions.length).toBe(1);
    });

    it('не мутира оригиналния state', () => {
        const state = makeState({ questions: [] });
        addQuestion(state);
        expect(state.questions.length).toBe(0);
    });

    it('новият въпрос има уникален id', () => {
        const state = makeState({ questions: [] });
        const s1 = addQuestion(state);
        const s2 = addQuestion(state);
        expect(s1.questions[0].id).not.toBe(s2.questions[0].id);
    });

    it('новият въпрос има празен текст', () => {
        const state = makeState({ questions: [] });
        const newState = addQuestion(state);
        expect(newState.questions[0].text).toBe('');
    });

    it('новият въпрос има 2 празни отговора', () => {
        const state = makeState({ questions: [] });
        const newState = addQuestion(state);
        expect(newState.questions[0].answers.length).toBe(2);
    });

    it('запазва съществуващите въпроси', () => {
        const state = makeState();
        const newState = addQuestion(state);
        expect(newState.questions.length).toBe(2);
        expect(newState.questions[0].id).toBe('q-1');
    });
});

describe('removeQuestion', () => {
    it('премахва въпроса по id', () => {
        const state = makeState();
        const newState = removeQuestion(state, 'q-1');
        expect(newState.questions.length).toBe(0);
    });

    it('не мутира оригиналния state', () => {
        const state = makeState();
        removeQuestion(state, 'q-1');
        expect(state.questions.length).toBe(1);
    });

    it('не премахва въпроси с различен id', () => {
        const s = {
            questions: [
                { id: 'q-1', text: 'В1', answers: [] },
                { id: 'q-2', text: 'В2', answers: [] },
            ],
        };
        const newState = removeQuestion(s, 'q-1');
        expect(newState.questions.length).toBe(1);
        expect(newState.questions[0].id).toBe('q-2');
    });
});

describe('updateQuestionText', () => {
    it('обновява текста на въпроса', () => {
        const state = makeState();
        const newState = updateQuestionText(state, 'q-1', 'Нов текст');
        expect(newState.questions[0].text).toBe('Нов текст');
    });

    it('не мутира оригиналния state', () => {
        const state = makeState();
        updateQuestionText(state, 'q-1', 'Нов текст');
        expect(state.questions[0].text).toBe('Какво е JS?');
    });

    it('не засяга другите полета на въпроса', () => {
        const state = makeState();
        const newState = updateQuestionText(state, 'q-1', 'Нов текст');
        expect(newState.questions[0].answers.length).toBe(2);
    });
});

describe('addAnswer', () => {
    it('добавя нов отговор към въпроса', () => {
        const state = makeState();
        const newState = addAnswer(state, 'q-1');
        expect(newState.questions[0].answers.length).toBe(3);
    });

    it('не мутира оригиналния state', () => {
        const state = makeState();
        addAnswer(state, 'q-1');
        expect(state.questions[0].answers.length).toBe(2);
    });

    it('новият отговор е с isCorrect: false', () => {
        const state = makeState();
        const newState = addAnswer(state, 'q-1');
        const newAnswer = newState.questions[0].answers[2];
        expect(newAnswer.isCorrect).toBe(false);
    });

    it('новият отговор има уникален id', () => {
        const state = makeState();
        const s1 = addAnswer(state, 'q-1');
        const s2 = addAnswer(state, 'q-1');
        const newId1 = s1.questions[0].answers[2].id;
        const newId2 = s2.questions[0].answers[2].id;
        expect(newId1).not.toBe(newId2);
    });
});

describe('removeAnswer', () => {
    it('премахва отговора по id', () => {
        const state = makeState();
        const newState = removeAnswer(state, 'q-1', 'a-1');
        expect(newState.questions[0].answers.length).toBe(1);
    });

    it('не мутира оригиналния state', () => {
        const state = makeState();
        removeAnswer(state, 'q-1', 'a-1');
        expect(state.questions[0].answers.length).toBe(2);
    });

    it('запазва останалите отговори', () => {
        const state = makeState();
        const newState = removeAnswer(state, 'q-1', 'a-1');
        expect(newState.questions[0].answers[0].id).toBe('a-2');
    });
});

describe('updateAnswerText', () => {
    it('обновява текста на отговора', () => {
        const state = makeState();
        const newState = updateAnswerText(state, 'q-1', 'a-1', 'Актуализиран отговор');
        expect(newState.questions[0].answers[0].text).toBe('Актуализиран отговор');
    });

    it('не мутира оригиналния state', () => {
        const state = makeState();
        updateAnswerText(state, 'q-1', 'a-1', 'Нов текст');
        expect(state.questions[0].answers[0].text).toBe('Програмен език');
    });
});

describe('setCorrectAnswer', () => {
    it('маркира отговора като верен', () => {
        const state = makeState();
        const newState = setCorrectAnswer(state, 'q-1', 'a-2');
        expect(newState.questions[0].answers[1].isCorrect).toBe(true);
    });

    it('размаркира предишния верен отговор', () => {
        const state = makeState();
        const newState = setCorrectAnswer(state, 'q-1', 'a-2');
        expect(newState.questions[0].answers[0].isCorrect).toBe(false);
    });

    it('само 1 отговор е верен след промяна', () => {
        const state = makeState();
        const newState = setCorrectAnswer(state, 'q-1', 'a-2');
        const correctCount = newState.questions[0].answers.filter(a => a.isCorrect).length;
        expect(correctCount).toBe(1);
    });

    it('не мутира оригиналния state', () => {
        const state = makeState();
        setCorrectAnswer(state, 'q-1', 'a-2');
        expect(state.questions[0].answers[0].isCorrect).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// renderStepQuestions — DOM рендиране
// ---------------------------------------------------------------------------

describe('renderStepQuestions — структура', () => {
    it('връща DOM елемент', () => {
        const state = makeState();
        const el = renderStepQuestions(state, vi.fn());
        expect(el).toBeInstanceOf(HTMLElement);
    });

    it('рендира карта за всеки въпрос', () => {
        const state = makeState();
        const el = renderStepQuestions(state, vi.fn());
        const questionCards = el.querySelectorAll('.question-card');
        expect(questionCards.length).toBe(1);
    });

    it('рендира бутон "Добави въпрос"', () => {
        const state = makeState();
        const el = renderStepQuestions(state, vi.fn());
        const addBtn = el.querySelector('[data-action="add-question"]');
        expect(addBtn).not.toBeNull();
    });

    it('рендира 0 карти при празен масив', () => {
        const state = makeState({ questions: [] });
        const el = renderStepQuestions(state, vi.fn());
        const questionCards = el.querySelectorAll('.question-card');
        expect(questionCards.length).toBe(0);
    });
});

describe('renderStepQuestions — callbacks', () => {
    it('onStateChange се извиква при клик "Добави въпрос"', () => {
        const onStateChange = vi.fn();
        const state = makeState({ questions: [] });
        const el = renderStepQuestions(state, onStateChange);
        const addBtn = el.querySelector('[data-action="add-question"]');
        addBtn.click();
        expect(onStateChange).toHaveBeenCalled();
    });

    it('новият state има 1 допълнителен въпрос след добавяне', () => {
        const onStateChange = vi.fn();
        const state = makeState({ questions: [] });
        const el = renderStepQuestions(state, onStateChange);
        const addBtn = el.querySelector('[data-action="add-question"]');
        addBtn.click();
        const newState = onStateChange.mock.calls[0][0];
        expect(newState.questions.length).toBe(1);
    });
});

describe('renderStepQuestions — показване на грешки', () => {
    it('показва грешки когато са подадени', () => {
        const state = makeState({ questions: [] });
        const errors = ['Добавете поне 1 въпрос'];
        const el = renderStepQuestions(state, vi.fn(), errors);
        const errorEls = el.querySelectorAll('.form-error');
        expect(errorEls.length).toBeGreaterThan(0);
    });

    it('не показва form-error при липса на грешки', () => {
        const state = makeState();
        const el = renderStepQuestions(state, vi.fn(), []);
        const errorEls = el.querySelectorAll('.form-error');
        expect(errorEls.length).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// updateSampleAnswer
// ---------------------------------------------------------------------------

const { updateSampleAnswer } = await import('../../../views/wizard/stepQuestionsView.js');

describe('updateSampleAnswer', () => {
    it('задава sampleAnswer на целевия въпрос', () => {
        const state = {
            questions: [
                { id: 'q-1', text: 'Въпрос 1', type: 'Open', answers: [] },
                { id: 'q-2', text: 'Въпрос 2', type: 'Code', answers: [] },
            ],
        };
        const newState = updateSampleAnswer(state, 'q-1', 'Примерен отговор');
        expect(newState.questions[0].sampleAnswer).toBe('Примерен отговор');
    });

    it('не засяга другите въпроси', () => {
        const state = {
            questions: [
                { id: 'q-1', text: 'Въпрос 1', type: 'Open', answers: [], sampleAnswer: '' },
                { id: 'q-2', text: 'Въпрос 2', type: 'Code', answers: [], sampleAnswer: '' },
            ],
        };
        const newState = updateSampleAnswer(state, 'q-1', 'Нов примерен отговор');
        expect(newState.questions[1].sampleAnswer).toBe('');
    });

    it('не мутира оригиналния state (immutable)', () => {
        const state = {
            questions: [
                { id: 'q-1', text: 'Въпрос 1', type: 'Open', answers: [], sampleAnswer: 'стар' },
            ],
        };
        updateSampleAnswer(state, 'q-1', 'нов');
        expect(state.questions[0].sampleAnswer).toBe('стар');
    });
});

// ---------------------------------------------------------------------------
// updateQuestionType — допълнения за sampleAnswer
// ---------------------------------------------------------------------------

const { updateQuestionType } = await import('../../../views/wizard/stepQuestionsView.js');

describe('updateQuestionType — sampleAnswer поведение', () => {
    it('смяна Open→Closed изчиства sampleAnswer', () => {
        const state = {
            questions: [
                { id: 'q-1', text: 'Въпрос', type: 'Open', answers: [], sampleAnswer: 'примерен' },
            ],
        };
        const newState = updateQuestionType(state, 'q-1', 'Closed');
        expect(newState.questions[0].sampleAnswer).toBeUndefined();
    });

    it('смяна Code→Multi изчиства sampleAnswer', () => {
        const state = {
            questions: [
                { id: 'q-1', text: 'Въпрос', type: 'Code', answers: [], sampleAnswer: 'print("hi")' },
            ],
        };
        const newState = updateQuestionType(state, 'q-1', 'Multi');
        expect(newState.questions[0].sampleAnswer).toBeUndefined();
    });

    it('смяна Open→Code запазва sampleAnswer', () => {
        const state = {
            questions: [
                { id: 'q-1', text: 'Въпрос', type: 'Open', answers: [], sampleAnswer: 'примерен' },
            ],
        };
        const newState = updateQuestionType(state, 'q-1', 'Code');
        expect(newState.questions[0].sampleAnswer).toBe('примерен');
    });
});

// ---------------------------------------------------------------------------
// validateStep3 — допълнения за sampleAnswer дължина
// ---------------------------------------------------------------------------

describe('validateStep3 — sampleAnswer дължина', () => {
    it('valid:true при Open въпрос с sampleAnswer в рамките на 10000 символа', () => {
        const state = {
            questions: [{
                id: 'q-1',
                text: 'Обясни',
                type: 'Open',
                answers: [],
                sampleAnswer: 'кратък отговор',
            }],
        };
        const result = validateStep3(state);
        expect(result.valid).toBe(true);
    });

    it('valid:true при Open въпрос без sampleAnswer', () => {
        const state = {
            questions: [{
                id: 'q-1',
                text: 'Обясни',
                type: 'Open',
                answers: [],
            }],
        };
        const result = validateStep3(state);
        expect(result.valid).toBe(true);
    });

    it('грешка при Open sampleAnswer > 10000 символа', () => {
        const state = {
            questions: [{
                id: 'q-1',
                text: 'Обясни',
                type: 'Open',
                answers: [],
                sampleAnswer: 'x'.repeat(10001),
            }],
        };
        const result = validateStep3(state);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('грешка при Code sampleAnswer > 50000 символа', () => {
        const state = {
            questions: [{
                id: 'q-1',
                text: 'Напиши код',
                type: 'Code',
                answers: [],
                sampleAnswer: 'x'.repeat(50001),
            }],
        };
        const result = validateStep3(state);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });
});

// ---------------------------------------------------------------------------
// applyPatch — 'update-sample-answer'
// ---------------------------------------------------------------------------

describe('applyPatch — update-sample-answer', () => {
    it("patch 'update-sample-answer' обновява sampleAnswer на въпроса", () => {
        const onStateChange = vi.fn();
        const state = {
            questions: [{
                id: 'q-1',
                text: 'Въпрос',
                type: 'Open',
                answers: [],
                sampleAnswer: '',
            }],
        };
        const el = renderStepQuestions(state, onStateChange);
        // Намираме textarea за sampleAnswer (след hint-а) за Open въпрос
        const sampleAnswerTA = el.querySelector('[data-sample-answer-for="q-1"]');
        expect(sampleAnswerTA).not.toBeNull();
        sampleAnswerTA.value = 'Примерен отговор';
        sampleAnswerTA.dispatchEvent(new Event('input'));
        expect(onStateChange).toHaveBeenCalled();
        const newState = onStateChange.mock.calls[0][0];
        expect(newState.questions[0].sampleAnswer).toBe('Примерен отговор');
    });
});

// ---------------------------------------------------------------------------
// renderStepQuestions — onChange/onRemove callbacks от buildQuestionCard
// ---------------------------------------------------------------------------

describe('renderStepQuestions — onChange от question card', () => {
    it('onChange при промяна на текст на въпрос обновява state', () => {
        const onStateChange = vi.fn();
        const state = makeState();
        const el = renderStepQuestions(state, onStateChange);
        const textarea = el.querySelector('textarea');
        textarea.value = 'Нов текст на въпроса';
        textarea.dispatchEvent(new Event('input'));
        expect(onStateChange).toHaveBeenCalled();
        const newState = onStateChange.mock.calls[0][0];
        expect(newState.questions[0].text).toBe('Нов текст на въпроса');
    });

    it('onChange при добавяне на отговор обновява state', () => {
        const onStateChange = vi.fn();
        const state = makeState();
        const el = renderStepQuestions(state, onStateChange);
        const addAnswerBtn = el.querySelector('[data-action="add-answer"]');
        addAnswerBtn.click();
        expect(onStateChange).toHaveBeenCalled();
        const newState = onStateChange.mock.calls[0][0];
        expect(newState.questions[0].answers.length).toBe(3);
    });

    it('onChange при премахване на отговор обновява state (при 3 отговора)', () => {
        const onStateChange = vi.fn();
        const state = makeState({
            questions: [{
                id: 'q-1',
                text: 'Какво е JS?',
                answers: [
                    { id: 'a-1', text: 'Програмен език', isCorrect: true },
                    { id: 'a-2', text: 'База данни', isCorrect: false },
                    { id: 'a-3', text: 'Скрипт', isCorrect: false },
                ],
            }],
        });
        const el = renderStepQuestions(state, onStateChange);
        const removeAnswerBtn = el.querySelector('[data-action="remove-answer"]');
        removeAnswerBtn.click();
        expect(onStateChange).toHaveBeenCalled();
        const newState = onStateChange.mock.calls[0][0];
        expect(newState.questions[0].answers.length).toBe(2);
    });

    it('onChange при промяна на текст на отговор обновява state', () => {
        const onStateChange = vi.fn();
        const state = makeState();
        const el = renderStepQuestions(state, onStateChange);
        const answerInputs = el.querySelectorAll('[data-answer-id] input[type="text"]');
        answerInputs[0].value = 'Актуализиран отговор';
        answerInputs[0].dispatchEvent(new Event('input'));
        expect(onStateChange).toHaveBeenCalled();
        const newState = onStateChange.mock.calls[0][0];
        expect(newState.questions[0].answers[0].text).toBe('Актуализиран отговор');
    });

    it('onChange при смяна на верен отговор обновява state', () => {
        const onStateChange = vi.fn();
        const state = makeState();
        const el = renderStepQuestions(state, onStateChange);
        const radios = el.querySelectorAll('input[type="radio"]');
        radios[1].dispatchEvent(new Event('change'));
        expect(onStateChange).toHaveBeenCalled();
        const newState = onStateChange.mock.calls[0][0];
        expect(newState.questions[0].answers[1].isCorrect).toBe(true);
        expect(newState.questions[0].answers[0].isCorrect).toBe(false);
    });

    it('onRemove при клик на бутон за премахване на въпрос', () => {
        const onStateChange = vi.fn();
        const state = makeState();
        const el = renderStepQuestions(state, onStateChange);
        const removeQuestionBtn = el.querySelector('[data-action="remove-question"]');
        removeQuestionBtn.click();
        expect(onStateChange).toHaveBeenCalled();
        const newState = onStateChange.mock.calls[0][0];
        expect(newState.questions.length).toBe(0);
    });
});
