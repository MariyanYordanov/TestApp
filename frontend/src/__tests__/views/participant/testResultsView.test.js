// Тестове за views/participant/testResultsView.js
// Стъпка 47 — testResultsView.test.js
// Обновени тестове: buildResultsScreen вече приема (test, participantName, attemptResult)
// където attemptResult идва от сървъра.

import { buildResultsScreen } from '../../../views/participant/testResultsView.js';

// Примерен PublicTestResponse (от сървъра — без isCorrect на отговорите)
const SAMPLE_TEST = {
    shareCode: 'ABCD1234',
    title: 'Тест по JavaScript',
    description: 'Основни концепции на JavaScript.',
    duration: 1800,
    questions: [
        {
            id: 'q-1',
            text: 'Какво е JavaScript?',
            answers: [
                { id: 'a-1', text: 'Програмен език' },
                { id: 'a-2', text: 'База данни' },
                { id: 'a-3', text: 'Операционна система' },
            ],
        },
        {
            id: 'q-2',
            text: 'Кой е правилният начин за деклариране на константа?',
            answers: [
                { id: 'a-4', text: 'var x = 5' },
                { id: 'a-5', text: 'const x = 5' },
                { id: 'a-6', text: 'x := 5' },
            ],
        },
        {
            id: 'q-3',
            text: 'Какво връща typeof null?',
            answers: [
                { id: 'a-7', text: '"null"' },
                { id: 'a-8', text: '"object"' },
                { id: 'a-9', text: '"undefined"' },
            ],
        },
    ],
};

// Примерен AttemptResultResponse (от сървъра след submitAttempt)
const SAMPLE_ATTEMPT_RESULT = {
    score: 1,
    totalQuestions: 3,
    percent: 33.33,
    results: [
        { questionId: 'q-1', questionText: 'Какво е JavaScript?', selectedAnswerId: 'a-1', isCorrect: true },
        { questionId: 'q-2', questionText: 'Кой е правилният начин за деклариране на константа?', selectedAnswerId: 'a-4', isCorrect: false },
        { questionId: 'q-3', questionText: 'Какво връща typeof null?', selectedAnswerId: null, isCorrect: false },
    ],
};

describe('testResultsView.js — buildResultsScreen с server AttemptResultResponse', () => {
    it('връща HTMLElement', () => {
        const el = buildResultsScreen(SAMPLE_TEST, 'Иван Иванов', SAMPLE_ATTEMPT_RESULT);
        expect(el instanceof HTMLElement).toBe(true);
    });

    it('показва score "1 от 3"', () => {
        const el = buildResultsScreen(SAMPLE_TEST, 'Иван Иванов', SAMPLE_ATTEMPT_RESULT);
        expect(el.textContent).toContain('1');
        expect(el.textContent).toContain('3');
    });

    it('показва процент (33)', () => {
        const el = buildResultsScreen(SAMPLE_TEST, 'Иван Иванов', SAMPLE_ATTEMPT_RESULT);
        expect(el.textContent).toMatch(/33/);
    });

    it('показва link към началната страница с href="/"', () => {
        const el = buildResultsScreen(SAMPLE_TEST, 'Иван Иванов', SAMPLE_ATTEMPT_RESULT);
        const link = el.querySelector('a[href="/"]');
        expect(link).not.toBeNull();
    });

    it('link "Към началната страница" е видим', () => {
        const el = buildResultsScreen(SAMPLE_TEST, 'Иван Иванов', SAMPLE_ATTEMPT_RESULT);
        const link = el.querySelector('a[href="/"]');
        expect(link.textContent).toContain('началната');
    });

    it('въпрос с верен отговор има клас .correct', () => {
        const el = buildResultsScreen(SAMPLE_TEST, 'Иван Иванов', SAMPLE_ATTEMPT_RESULT);
        const correctCards = el.querySelectorAll('.correct');
        expect(correctCards.length).toBeGreaterThan(0);
    });

    it('въпрос с грешен отговор има клас .incorrect', () => {
        const el = buildResultsScreen(SAMPLE_TEST, 'Иван Иванов', SAMPLE_ATTEMPT_RESULT);
        const incorrectCards = el.querySelectorAll('.incorrect');
        expect(incorrectCards.length).toBeGreaterThan(0);
    });

    it('показва точно 1 .correct карта (само 1 верен)', () => {
        const el = buildResultsScreen(SAMPLE_TEST, 'Иван Иванов', SAMPLE_ATTEMPT_RESULT);
        // .correct е клас на question-result — не трябва да съдържа .results-header
        const correctCards = el.querySelectorAll('.question-result.correct');
        expect(correctCards.length).toBe(1);
    });

    it('показва 2 .incorrect карти (2 грешни)', () => {
        const el = buildResultsScreen(SAMPLE_TEST, 'Иван Иванов', SAMPLE_ATTEMPT_RESULT);
        const incorrectCards = el.querySelectorAll('.question-result.incorrect');
        expect(incorrectCards.length).toBe(2);
    });

    it('показва текста на въпросите', () => {
        const el = buildResultsScreen(SAMPLE_TEST, 'Иван Иванов', SAMPLE_ATTEMPT_RESULT);
        expect(el.textContent).toContain('Какво е JavaScript?');
    });

    it('показва текста на избрания отговор (look up от test.questions)', () => {
        const el = buildResultsScreen(SAMPLE_TEST, 'Иван Иванов', SAMPLE_ATTEMPT_RESULT);
        // q-1 → selectedAnswerId a-1 → "Програмен език"
        expect(el.textContent).toContain('Програмен език');
    });

    it('показва текста на грешно избрания отговор', () => {
        const el = buildResultsScreen(SAMPLE_TEST, 'Иван Иванов', SAMPLE_ATTEMPT_RESULT);
        // q-2 → selectedAnswerId a-4 → "var x = 5"
        expect(el.textContent).toContain('var x = 5');
    });

    it('показва 100% при всички верни (score === totalQuestions)', () => {
        const allCorrect = {
            score: 3,
            totalQuestions: 3,
            percent: 100,
            results: SAMPLE_ATTEMPT_RESULT.results.map(r => ({ ...r, isCorrect: true })),
        };
        const el = buildResultsScreen(SAMPLE_TEST, 'Иван Иванов', allCorrect);
        expect(el.textContent).toMatch(/100/);
    });

    it('показва 0% при всички грешни (score === 0)', () => {
        const allWrong = {
            score: 0,
            totalQuestions: 3,
            percent: 0,
            results: SAMPLE_ATTEMPT_RESULT.results.map(r => ({ ...r, isCorrect: false })),
        };
        const el = buildResultsScreen(SAMPLE_TEST, 'Иван Иванов', allWrong);
        expect(el.textContent).toMatch(/0/);
    });

    it('не хвърля грешка при празен масив results', () => {
        const emptyResult = { score: 0, totalQuestions: 0, percent: 0, results: [] };
        expect(() => buildResultsScreen(SAMPLE_TEST, 'Иван Иванов', emptyResult)).not.toThrow();
    });

    it('не хвърля грешка при selectedAnswerId = null (пропуснат въпрос)', () => {
        expect(() => buildResultsScreen(SAMPLE_TEST, 'Мария', SAMPLE_ATTEMPT_RESULT)).not.toThrow();
    });

    it('показва името на участника', () => {
        const el = buildResultsScreen(SAMPLE_TEST, 'Петър Петров', SAMPLE_ATTEMPT_RESULT);
        expect(el.textContent).toContain('Петър Петров');
    });
});
