// TDD тестове за scoring логиката в wizard
// Покрива: getDefaultPoints, updateQuestionPoints, applyPatch 'update-question-points'
// и DOM рендиране на поле за точки

const {
    getDefaultPoints,
    updateQuestionPoints,
    addQuestion,
    updateQuestionType,
    addAnswer,
    removeAnswer,
    renderStepQuestions,
} = await import('../../../views/wizard/stepQuestionsView.js');

// ---------------------------------------------------------------------------
// getDefaultPoints — изчислява точки по подразбиране
// ---------------------------------------------------------------------------

describe('getDefaultPoints — по подразбиране', () => {
    it('Open → 3 точки', () => {
        expect(getDefaultPoints('Open', 0)).toBe(3);
    });

    it('Code → 4 точки', () => {
        expect(getDefaultPoints('Code', 0)).toBe(4);
    });

    it('Closed с 2 отговора → ceil(2/2) = 1', () => {
        expect(getDefaultPoints('Closed', 2)).toBe(1);
    });

    it('Closed с 4 отговора → ceil(4/2) = 2', () => {
        expect(getDefaultPoints('Closed', 4)).toBe(2);
    });

    it('Closed с 3 отговора → ceil(3/2) = 2', () => {
        expect(getDefaultPoints('Closed', 3)).toBe(2);
    });

    it('Multi с 3 отговора → 3', () => {
        expect(getDefaultPoints('Multi', 3)).toBe(3);
    });

    it('Multi с 0 отговора → 1 (min)', () => {
        expect(getDefaultPoints('Multi', 0)).toBe(1);
    });

    it('Closed с 0 отговора → 1 (min)', () => {
        expect(getDefaultPoints('Closed', 0)).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// updateQuestionPoints — immutable state update
// ---------------------------------------------------------------------------

describe('updateQuestionPoints — immutable', () => {
    it('обновява points на целевия въпрос', () => {
        const state = {
            questions: [
                { id: 'q-1', text: 'Въпрос', type: 'Closed', points: 1, answers: [] },
                { id: 'q-2', text: 'Въпрос 2', type: 'Open', points: 3, answers: [] },
            ],
        };
        const newState = updateQuestionPoints(state, 'q-1', 5);
        expect(newState.questions[0].points).toBe(5);
    });

    it('не засяга другите въпроси', () => {
        const state = {
            questions: [
                { id: 'q-1', text: 'Въпрос 1', type: 'Closed', points: 1, answers: [] },
                { id: 'q-2', text: 'Въпрос 2', type: 'Open', points: 3, answers: [] },
            ],
        };
        const newState = updateQuestionPoints(state, 'q-1', 7);
        expect(newState.questions[1].points).toBe(3);
    });

    it('не мутира оригиналния state (immutable)', () => {
        const state = {
            questions: [
                { id: 'q-1', text: 'Въпрос', type: 'Closed', points: 1, answers: [] },
            ],
        };
        updateQuestionPoints(state, 'q-1', 10);
        expect(state.questions[0].points).toBe(1);
    });

    it('не засяга другите полета на въпроса', () => {
        const state = {
            questions: [
                { id: 'q-1', text: 'Оригинален текст', type: 'Closed', points: 1, answers: [] },
            ],
        };
        const newState = updateQuestionPoints(state, 'q-1', 5);
        expect(newState.questions[0].text).toBe('Оригинален текст');
        expect(newState.questions[0].type).toBe('Closed');
    });
});

// ---------------------------------------------------------------------------
// addQuestion — новият въпрос има points по подразбиране
// ---------------------------------------------------------------------------

describe('addQuestion — включва points', () => {
    it('новият въпрос има points поле', () => {
        const state = { questions: [] };
        const newState = addQuestion(state);
        expect(newState.questions[0]).toHaveProperty('points');
    });

    it('новият Closed въпрос с 2 отговора има points = 1 (ceil(2/2))', () => {
        const state = { questions: [] };
        const newState = addQuestion(state);
        // Default е Closed с 2 отговора → ceil(2/2) = 1
        expect(newState.questions[0].points).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// updateQuestionType — auto-updates points при смяна на тип
// ---------------------------------------------------------------------------

describe('updateQuestionType — auto-updates points', () => {
    it('Closed → Open обновява points на 3', () => {
        const state = {
            questions: [
                { id: 'q-1', text: 'Въпрос', type: 'Closed', points: 1, answers: [] },
            ],
        };
        const newState = updateQuestionType(state, 'q-1', 'Open');
        expect(newState.questions[0].points).toBe(3);
    });

    it('Closed → Code обновява points на 4', () => {
        const state = {
            questions: [
                { id: 'q-1', text: 'Въпрос', type: 'Closed', points: 1, answers: [] },
            ],
        };
        const newState = updateQuestionType(state, 'q-1', 'Code');
        expect(newState.questions[0].points).toBe(4);
    });

    it('Open → Closed с 2 отговора обновява points на 1', () => {
        const state = {
            questions: [
                {
                    id: 'q-1', text: 'Въпрос', type: 'Open', points: 3, answers: [],
                },
            ],
        };
        const newState = updateQuestionType(state, 'q-1', 'Closed');
        // Closed с 2 добавени отговора (по подразбиране при смяна от Open) → ceil(2/2) = 1
        expect(newState.questions[0].points).toBe(1);
    });

    it('добавяне на отговор не засяга ръчно зададените points', () => {
        // Points се обновяват автоматично само при смяна на тип, не при addAnswer
        const state = {
            questions: [
                {
                    id: 'q-1', text: 'Въпрос', type: 'Multi', points: 5,
                    answers: [
                        { id: 'a-1', text: 'A1', isCorrect: true },
                        { id: 'a-2', text: 'A2', isCorrect: false },
                    ],
                },
            ],
        };
        const newState = addAnswer(state, 'q-1');
        // addAnswer не трябва да засяга points
        expect(newState.questions[0].points).toBe(5);
    });
});

// ---------------------------------------------------------------------------
// renderStepQuestions — DOM рендира points input
// ---------------------------------------------------------------------------

describe('renderStepQuestions — points input в DOM', () => {
    function makeState(overrides = {}) {
        return {
            questions: [
                {
                    id: 'q-1',
                    text: 'Въпрос',
                    type: 'Closed',
                    points: 2,
                    answers: [
                        { id: 'a-1', text: 'Верен', isCorrect: true },
                        { id: 'a-2', text: 'Грешен', isCorrect: false },
                    ],
                },
            ],
            ...overrides,
        };
    }

    it('рендира number input за points', () => {
        const el = renderStepQuestions(makeState(), vi.fn());
        const pointsInput = el.querySelector('[data-points-for="q-1"]');
        expect(pointsInput).not.toBeNull();
    });

    it('points input показва текущата стойност', () => {
        const el = renderStepQuestions(makeState(), vi.fn());
        const pointsInput = el.querySelector('[data-points-for="q-1"]');
        expect(parseInt(pointsInput.value)).toBe(2);
    });

    it('points input е от тип number', () => {
        const el = renderStepQuestions(makeState(), vi.fn());
        const pointsInput = el.querySelector('[data-points-for="q-1"]');
        expect(pointsInput.type).toBe('number');
    });

    it('onChange се извиква при промяна на points', () => {
        const onStateChange = vi.fn();
        const el = renderStepQuestions(makeState(), onStateChange);
        const pointsInput = el.querySelector('[data-points-for="q-1"]');
        pointsInput.value = '5';
        pointsInput.dispatchEvent(new Event('input'));
        expect(onStateChange).toHaveBeenCalled();
    });

    it('onChange обновява points в state', () => {
        const onStateChange = vi.fn();
        const el = renderStepQuestions(makeState(), onStateChange);
        const pointsInput = el.querySelector('[data-points-for="q-1"]');
        pointsInput.value = '7';
        pointsInput.dispatchEvent(new Event('input'));
        const newState = onStateChange.mock.calls[0][0];
        expect(newState.questions[0].points).toBe(7);
    });

    it('points input има min="1"', () => {
        const el = renderStepQuestions(makeState(), vi.fn());
        const pointsInput = el.querySelector('[data-points-for="q-1"]');
        expect(pointsInput.min).toBe('1');
    });

    it('points input има max="100"', () => {
        const el = renderStepQuestions(makeState(), vi.fn());
        const pointsInput = el.querySelector('[data-points-for="q-1"]');
        expect(pointsInput.max).toBe('100');
    });
});

// ---------------------------------------------------------------------------
// applyPatch — 'update-question-points'
// ---------------------------------------------------------------------------

describe('applyPatch — update-question-points', () => {
    it("patch 'update-question-points' обновява points", () => {
        const onStateChange = vi.fn();
        const state = {
            questions: [
                {
                    id: 'q-1', text: 'Въпрос', type: 'Closed', points: 1,
                    answers: [
                        { id: 'a-1', text: 'Верен', isCorrect: true },
                        { id: 'a-2', text: 'Грешен', isCorrect: false },
                    ],
                },
            ],
        };
        const el = renderStepQuestions(state, onStateChange);
        const pointsInput = el.querySelector('[data-points-for="q-1"]');
        pointsInput.value = '8';
        pointsInput.dispatchEvent(new Event('input'));
        expect(onStateChange).toHaveBeenCalled();
        const newState = onStateChange.mock.calls[0][0];
        expect(newState.questions[0].points).toBe(8);
    });
});
