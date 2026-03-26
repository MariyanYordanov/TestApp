// Тестове за attemptDetailTemplate.js

import {
    buildQuestionDetailCard,
} from '../../templates/attemptDetailTemplate.js';

// ---------------------------------------------------------------------------
// Помощни данни
// ---------------------------------------------------------------------------

const makeClosedQuestion = (overrides = {}) => ({
    questionId: 'q-1',
    questionText: 'Кое е вярно?',
    questionType: 'Closed',
    scorable: true,
    sampleAnswer: null,
    answers: [
        { answerId: 'a-1', text: 'Верен отговор', isCorrect: true, wasSelected: true },
        { answerId: 'a-2', text: 'Грешен отговор', isCorrect: false, wasSelected: false },
    ],
    openText: null,
    isCorrect: true,
    gradingStatus: 'NotApplicable',
    aiFeedback: null,
    aiScore: null,
    ...overrides,
});

const makeOpenQuestion = (overrides = {}) => ({
    questionId: 'q-2',
    questionText: 'Обяснете фотосинтезата.',
    questionType: 'Open',
    scorable: false,
    sampleAnswer: 'Процес на производство на глюкоза',
    answers: [],
    openText: 'Отговорът на ученика',
    isCorrect: null,
    gradingStatus: 'Pending',
    aiFeedback: null,
    aiScore: null,
    ...overrides,
});

// ---------------------------------------------------------------------------
// buildQuestionDetailCard() — основни тестове
// ---------------------------------------------------------------------------

describe('buildQuestionDetailCard() — структура', () => {
    it('създава div елемент', () => {
        const card = buildQuestionDetailCard(makeClosedQuestion());
        expect(card.tagName).toBe('DIV');
    });

    it('съдържа class attempt-question-card', () => {
        const card = buildQuestionDetailCard(makeClosedQuestion());
        expect(card.className).toContain('attempt-question-card');
    });

    it('показва типа на въпроса', () => {
        const card = buildQuestionDetailCard(makeClosedQuestion());
        expect(card.textContent).toContain('Затворен');
    });

    it('показва текста на въпроса', () => {
        const card = buildQuestionDetailCard(makeClosedQuestion({ questionText: 'Тестов въпрос?' }));
        expect(card.textContent).toContain('Тестов въпрос?');
    });
});

// ---------------------------------------------------------------------------
// buildQuestionDetailCard() — Closed въпрос
// ---------------------------------------------------------------------------

describe('buildQuestionDetailCard() — Closed въпрос', () => {
    it('съдържа клас verdict-correct при верен отговор', () => {
        const card = buildQuestionDetailCard(makeClosedQuestion({ isCorrect: true }));
        expect(card.className).toContain('verdict-correct');
    });

    it('съдържа клас verdict-incorrect при грешен отговор', () => {
        const card = buildQuestionDetailCard(makeClosedQuestion({ isCorrect: false }));
        expect(card.className).toContain('verdict-incorrect');
    });

    it('показва всички отговори', () => {
        const question = makeClosedQuestion();
        const card = buildQuestionDetailCard(question);
        const rows = card.querySelectorAll('.aq-answer-row');
        expect(rows.length).toBe(2);
    });

    it('маркира избрания отговор с class answer-selected', () => {
        const card = buildQuestionDetailCard(makeClosedQuestion());
        const selectedRows = card.querySelectorAll('.answer-selected');
        expect(selectedRows.length).toBeGreaterThan(0);
    });

    it('маркира верния отговор с class answer-correct', () => {
        const card = buildQuestionDetailCard(makeClosedQuestion());
        const correctRows = card.querySelectorAll('.answer-correct');
        expect(correctRows.length).toBeGreaterThan(0);
    });

    it('маркира грешно избрания отговор с class answer-wrong', () => {
        const question = makeClosedQuestion({
            isCorrect: false,
            answers: [
                { answerId: 'a-1', text: 'Верен', isCorrect: true, wasSelected: false },
                { answerId: 'a-2', text: 'Грешен', isCorrect: false, wasSelected: true },
            ],
        });
        const card = buildQuestionDetailCard(question);
        const wrongRows = card.querySelectorAll('.answer-wrong');
        expect(wrongRows.length).toBeGreaterThan(0);
    });

    it('показва текстовете на отговорите', () => {
        const card = buildQuestionDetailCard(makeClosedQuestion());
        expect(card.textContent).toContain('Верен отговор');
        expect(card.textContent).toContain('Грешен отговор');
    });
});

// ---------------------------------------------------------------------------
// buildQuestionDetailCard() — Open въпрос
// ---------------------------------------------------------------------------

describe('buildQuestionDetailCard() — Open въпрос', () => {
    it('показва типа "Отворен"', () => {
        const card = buildQuestionDetailCard(makeOpenQuestion());
        expect(card.textContent).toContain('Отворен');
    });

    it('показва отговора на ученика', () => {
        const card = buildQuestionDetailCard(makeOpenQuestion({ openText: 'Моят отговор' }));
        expect(card.textContent).toContain('Моят отговор');
    });

    it('показва "(без отговор)" при липсващ openText', () => {
        const card = buildQuestionDetailCard(makeOpenQuestion({ openText: null }));
        expect(card.textContent).toContain('без отговор');
    });

    it('показва примерния отговор ако има такъв', () => {
        const card = buildQuestionDetailCard(makeOpenQuestion({ sampleAnswer: 'Примерен' }));
        expect(card.textContent).toContain('Примерен');
    });

    it('не показва секция за примерен отговор ако sampleAnswer е null', () => {
        const card = buildQuestionDetailCard(makeOpenQuestion({ sampleAnswer: null }));
        const sampleSection = card.querySelector('.aq-sample-answer');
        expect(sampleSection).toBeNull();
    });

    it('показва pending статус', () => {
        const card = buildQuestionDetailCard(makeOpenQuestion({ gradingStatus: 'Pending' }));
        expect(card.className).toContain('verdict-pending');
    });

    it('показва AI feedback след оценяване', () => {
        const card = buildQuestionDetailCard(makeOpenQuestion({
            gradingStatus: 'Graded',
            aiFeedback: 'Добър отговор!',
            aiScore: 1,
        }));
        expect(card.textContent).toContain('Добър отговор!');
    });

    it('показва грешка при Failed статус', () => {
        const card = buildQuestionDetailCard(makeOpenQuestion({ gradingStatus: 'Failed' }));
        const errEl = card.querySelector('.aq-grading-error');
        expect(errEl).not.toBeNull();
    });

    it('verdict-correct при Graded + aiScore=1', () => {
        const card = buildQuestionDetailCard(makeOpenQuestion({
            gradingStatus: 'Graded',
            aiScore: 1,
        }));
        expect(card.className).toContain('verdict-correct');
    });

    it('verdict-incorrect при Graded + aiScore=0', () => {
        const card = buildQuestionDetailCard(makeOpenQuestion({
            gradingStatus: 'Graded',
            aiScore: 0,
        }));
        expect(card.className).toContain('verdict-incorrect');
    });
});

// ---------------------------------------------------------------------------
// buildQuestionDetailCard() — Code въпрос
// ---------------------------------------------------------------------------

describe('buildQuestionDetailCard() — Code въпрос', () => {
    it('показва типа "Код"', () => {
        const card = buildQuestionDetailCard(makeOpenQuestion({ questionType: 'Code' }));
        expect(card.textContent).toContain('Код');
    });

    it('третира Code като non-scorable', () => {
        const card = buildQuestionDetailCard(makeOpenQuestion({
            questionType: 'Code',
            scorable: false,
            gradingStatus: 'Pending',
        }));
        expect(card.className).toContain('verdict-pending');
    });
});

// ---------------------------------------------------------------------------
// buildQuestionDetailCard() — Multi въпрос
// ---------------------------------------------------------------------------

describe('buildQuestionDetailCard() — Multi въпрос', () => {
    it('показва типа "Множествен"', () => {
        const multiQuestion = makeClosedQuestion({ questionType: 'Multi' });
        const card = buildQuestionDetailCard(multiQuestion);
        expect(card.textContent).toContain('Множествен');
    });
});

// ---------------------------------------------------------------------------
// buildQuestionDetailCard() — XSS защита
// ---------------------------------------------------------------------------

describe('buildQuestionDetailCard() — XSS защита', () => {
    it('не изпълнява script в текста на въпроса', () => {
        const xss = '<script>alert("xss")</script>';
        const card = buildQuestionDetailCard(makeClosedQuestion({ questionText: xss }));
        expect(card.innerHTML).not.toContain('<script>');
        expect(card.textContent).toContain('alert');
    });

    it('HTML-енкодва специалните символи в отговора на ученика (защита от XSS)', () => {
        const xss = '<img src=x onerror=alert(1)>';
        const card = buildQuestionDetailCard(makeOpenQuestion({ openText: xss }));
        // textContent показва суровия текст — значи е безопасен
        const answerEl = card.querySelector('.aq-answer-text');
        expect(answerEl.textContent).toBe(xss);
        // Трябва да е HTML-енкодван в innerHTML (< > са &lt; &gt;)
        expect(card.innerHTML).toContain('&lt;img');
    });
});
