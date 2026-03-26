// Тестове за attemptDetailView.js

vi.mock('../../services/testService.js', () => ({
    getAttemptDetail: vi.fn(),
    gradeAttempt: vi.fn(),
}));

vi.mock('../../utils/notification.js', () => ({
    showToast: vi.fn(),
}));

const testServiceModule = await import('../../services/testService.js');
const { showToast } = await import('../../utils/notification.js');
const { showAttemptDetail } = await import('../../views/attemptDetailView.js');

function setupDom() {
    document.body.innerHTML = '<main id="main"></main>';
}

const makeDetail = (overrides = {}) => ({
    attemptId: 'attempt-uuid-1',
    participantName: 'Иван Петров',
    participantGroup: null,
    startedAt: '2026-03-26T10:00:00Z',
    finishedAt: null,
    score: 3,
    totalQuestions: 5,
    percent: 60,
    hasOpenAnswers: false,
    allGraded: true,
    questions: [
        {
            questionId: 'q-1',
            questionText: 'Въпрос 1?',
            questionType: 'Closed',
            scorable: true,
            sampleAnswer: null,
            answers: [
                { answerId: 'a-1', text: 'Верен', isCorrect: true, wasSelected: true },
            ],
            openText: null,
            isCorrect: true,
            gradingStatus: 'NotApplicable',
            aiFeedback: null,
            aiScore: null,
        },
    ],
    ...overrides,
});

beforeEach(() => {
    setupDom();
    vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Зареждане (loading state)
// ---------------------------------------------------------------------------

describe('showAttemptDetail() — loading state', () => {
    it('показва loading съобщение по начало', async () => {
        // Arrange
        testServiceModule.getAttemptDetail.mockReturnValue(new Promise(() => {})); // никога не resolve-ва

        // Act
        showAttemptDetail({ params: { testId: 'tid', attemptId: 'aid' } });

        // Assert
        const main = document.getElementById('main');
        expect(main.querySelector('.loading')).not.toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

describe('showAttemptDetail() — error state', () => {
    it('показва грешка при API грешка', async () => {
        // Arrange
        testServiceModule.getAttemptDetail.mockRejectedValueOnce(new Error('Грешка 500'));

        // Act
        await showAttemptDetail({ params: { testId: 'tid', attemptId: 'aid' } });

        // Assert
        const main = document.getElementById('main');
        const errorEl = main.querySelector('.error');
        expect(errorEl).not.toBeNull();
        expect(errorEl.textContent).toContain('Грешка 500');
    });

    it('показва error-card при null резултат (404)', async () => {
        // Arrange
        testServiceModule.getAttemptDetail.mockResolvedValueOnce(null);

        // Act
        await showAttemptDetail({ params: { testId: 'tid', attemptId: 'aid' } });

        // Assert
        const main = document.getElementById('main');
        expect(main.querySelector('.error-card')).not.toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Happy path — рендиране
// ---------------------------------------------------------------------------

describe('showAttemptDetail() — happy path', () => {
    it('показва името на участника', async () => {
        // Arrange
        testServiceModule.getAttemptDetail.mockResolvedValueOnce(makeDetail());

        // Act
        await showAttemptDetail({ params: { testId: 'tid', attemptId: 'aid' } });

        // Assert
        const main = document.getElementById('main');
        expect(main.textContent).toContain('Иван Петров');
    });

    it('показва резултата', async () => {
        // Arrange
        testServiceModule.getAttemptDetail.mockResolvedValueOnce(
            makeDetail({ score: 7, totalQuestions: 10, percent: 70 })
        );

        // Act
        await showAttemptDetail({ params: { testId: 'tid', attemptId: 'aid' } });

        // Assert
        const main = document.getElementById('main');
        expect(main.textContent).toContain('7');
        expect(main.textContent).toContain('10');
        expect(main.textContent).toContain('70%');
    });

    it('показва група ако е зададена', async () => {
        // Arrange
        testServiceModule.getAttemptDetail.mockResolvedValueOnce(
            makeDetail({ participantGroup: '10A' })
        );

        // Act
        await showAttemptDetail({ params: { testId: 'tid', attemptId: 'aid' } });

        // Assert
        const main = document.getElementById('main');
        expect(main.textContent).toContain('10A');
    });

    it('рендира картите с въпроси', async () => {
        // Arrange
        testServiceModule.getAttemptDetail.mockResolvedValueOnce(makeDetail());

        // Act
        await showAttemptDetail({ params: { testId: 'tid', attemptId: 'aid' } });

        // Assert
        const main = document.getElementById('main');
        const cards = main.querySelectorAll('.attempt-question-card');
        expect(cards.length).toBe(1);
    });

    it('показва back link към /statistics', async () => {
        // Arrange
        testServiceModule.getAttemptDetail.mockResolvedValueOnce(makeDetail());

        // Act
        await showAttemptDetail({ params: { testId: 'tid', attemptId: 'aid' } });

        // Assert
        const main = document.getElementById('main');
        const backLink = main.querySelector('a[href="/statistics"]');
        expect(backLink).not.toBeNull();
    });

    it('не показва AI бутон когато allGraded=true', async () => {
        // Arrange
        testServiceModule.getAttemptDetail.mockResolvedValueOnce(
            makeDetail({ hasOpenAnswers: true, allGraded: true })
        );

        // Act
        await showAttemptDetail({ params: { testId: 'tid', attemptId: 'aid' } });

        // Assert
        const main = document.getElementById('main');
        expect(main.querySelector('.grade-btn')).toBeNull();
    });

    it('не показва AI бутон когато hasOpenAnswers=false', async () => {
        // Arrange
        testServiceModule.getAttemptDetail.mockResolvedValueOnce(
            makeDetail({ hasOpenAnswers: false, allGraded: true })
        );

        // Act
        await showAttemptDetail({ params: { testId: 'tid', attemptId: 'aid' } });

        // Assert
        const main = document.getElementById('main');
        expect(main.querySelector('.grade-btn')).toBeNull();
    });

    it('показва AI бутон когато hasOpenAnswers=true и allGraded=false', async () => {
        // Arrange
        testServiceModule.getAttemptDetail.mockResolvedValueOnce(
            makeDetail({ hasOpenAnswers: true, allGraded: false })
        );

        // Act
        await showAttemptDetail({ params: { testId: 'tid', attemptId: 'aid' } });

        // Assert
        const main = document.getElementById('main');
        expect(main.querySelector('.grade-btn')).not.toBeNull();
    });
});

// ---------------------------------------------------------------------------
// AI grading button
// ---------------------------------------------------------------------------

describe('showAttemptDetail() — AI grade button', () => {
    it('кликването на AI бутон извиква gradeAttempt', async () => {
        // Arrange
        const detail = makeDetail({ hasOpenAnswers: true, allGraded: false });
        testServiceModule.getAttemptDetail.mockResolvedValue(detail);
        testServiceModule.gradeAttempt.mockResolvedValueOnce({ message: 'OK' });

        await showAttemptDetail({ params: { testId: 'test-id', attemptId: 'attempt-id' } });

        // Act
        const main = document.getElementById('main');
        const btn = main.querySelector('.grade-btn');
        btn.click();
        await new Promise(r => setTimeout(r, 0)); // flush promises

        // Assert
        expect(testServiceModule.gradeAttempt).toHaveBeenCalledWith('test-id', 'attempt-id');
    });

    it('показва toast при успешно AI оценяване', async () => {
        // Arrange
        const detail = makeDetail({ hasOpenAnswers: true, allGraded: false });
        testServiceModule.getAttemptDetail.mockResolvedValue(detail);
        testServiceModule.gradeAttempt.mockResolvedValueOnce({ message: 'OK' });

        await showAttemptDetail({ params: { testId: 'test-id', attemptId: 'attempt-id' } });

        // Act
        const main = document.getElementById('main');
        main.querySelector('.grade-btn').click();
        await new Promise(r => setTimeout(r, 10));

        // Assert
        expect(showToast).toHaveBeenCalledWith(expect.any(String), 'success');
    });

    it('показва error toast при грешка в AI оценяването', async () => {
        // Arrange
        const detail = makeDetail({ hasOpenAnswers: true, allGraded: false });
        testServiceModule.getAttemptDetail.mockResolvedValueOnce(detail);
        testServiceModule.gradeAttempt.mockRejectedValueOnce(new Error('AI грешка'));

        await showAttemptDetail({ params: { testId: 'test-id', attemptId: 'attempt-id' } });

        // Act
        const main = document.getElementById('main');
        main.querySelector('.grade-btn').click();
        await new Promise(r => setTimeout(r, 10));

        // Assert
        expect(showToast).toHaveBeenCalledWith(expect.stringContaining('AI грешка'), 'error');
    });

    it('бутонът се disable-ва по време на AI оценяване', async () => {
        // Arrange — gradeAttempt е бавен (никога не resolve-ва)
        const detail = makeDetail({ hasOpenAnswers: true, allGraded: false });
        testServiceModule.getAttemptDetail.mockResolvedValueOnce(detail);
        testServiceModule.gradeAttempt.mockReturnValue(new Promise(() => {}));

        await showAttemptDetail({ params: { testId: 'test-id', attemptId: 'attempt-id' } });

        // Act
        const main = document.getElementById('main');
        const btn = main.querySelector('.grade-btn');
        btn.click();
        await new Promise(r => setTimeout(r, 0));

        // Assert
        expect(btn.disabled).toBe(true);
    });
});
