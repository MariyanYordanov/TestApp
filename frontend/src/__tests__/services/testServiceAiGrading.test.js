// Тестове за новите AI grading функции в testService.js

vi.mock('../../services/api.js', () => ({
    api: {
        get:    vi.fn(),
        post:   vi.fn(),
        put:    vi.fn(),
        delete: vi.fn(),
    },
}));

const { api } = await import('../../services/api.js');
const { getAttemptDetail, gradeAttempt } = await import('../../services/testService.js');

beforeEach(() => {
    vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getAttemptDetail
// ---------------------------------------------------------------------------

describe('testService — getAttemptDetail()', () => {
    it('извиква api.get с правилния URL', async () => {
        const testId = 'test-uuid-1';
        const attemptId = 'attempt-uuid-1';
        api.get.mockResolvedValueOnce({ attemptId, participantName: 'Иван' });

        await getAttemptDetail(testId, attemptId);

        expect(api.get).toHaveBeenCalledWith(`/tests/${testId}/attempts/${attemptId}`);
    });

    it('връща детайлите на опита при успех', async () => {
        const detail = {
            attemptId: 'attempt-uuid-1',
            participantName: 'Иван Петров',
            score: 5,
            totalQuestions: 10,
            percent: 50,
            hasOpenAnswers: true,
            allGraded: false,
            questions: [
                { questionId: 'q-1', questionType: 'Closed', scorable: true, answers: [] },
                { questionId: 'q-2', questionType: 'Open', scorable: false, gradingStatus: 'Pending' },
            ],
        };
        api.get.mockResolvedValueOnce(detail);

        const result = await getAttemptDetail('test-1', 'attempt-1');

        expect(result).toEqual(detail);
    });

    it('връща null когато опитът не е намерен (404)', async () => {
        api.get.mockResolvedValueOnce(null);

        const result = await getAttemptDetail('test-1', 'nonexistent');

        expect(result).toBeNull();
    });

    it('хвърля грешка при API грешка', async () => {
        api.get.mockRejectedValueOnce(new Error('Нямаш достъп'));

        await expect(getAttemptDetail('test-1', 'attempt-1')).rejects.toThrow('Нямаш достъп');
    });

    it('работи с различни UUID формати', async () => {
        const testId = '00000000-0000-0000-0000-000000000001';
        const attemptId = '00000000-0000-0000-0000-000000000002';
        api.get.mockResolvedValueOnce({ attemptId });

        await getAttemptDetail(testId, attemptId);

        expect(api.get).toHaveBeenCalledWith(`/tests/${testId}/attempts/${attemptId}`);
    });
});

// ---------------------------------------------------------------------------
// gradeAttempt
// ---------------------------------------------------------------------------

describe('testService — gradeAttempt()', () => {
    it('извиква api.post с правилния URL и празен обект', async () => {
        const testId = 'test-uuid-1';
        const attemptId = 'attempt-uuid-1';
        api.post.mockResolvedValueOnce({ message: 'Оценяването завърши.' });

        await gradeAttempt(testId, attemptId);

        expect(api.post).toHaveBeenCalledWith(
            `/tests/${testId}/attempts/${attemptId}/grade`,
            {}
        );
    });

    it('връща отговора от сървъра при успех', async () => {
        const serverResponse = { message: 'Оценяването завърши.' };
        api.post.mockResolvedValueOnce(serverResponse);

        const result = await gradeAttempt('test-1', 'attempt-1');

        expect(result).toEqual(serverResponse);
    });

    it('хвърля грешка при API грешка', async () => {
        api.post.mockRejectedValueOnce(new Error('AI услугата не е достъпна'));

        await expect(gradeAttempt('test-1', 'attempt-1')).rejects.toThrow('AI услугата не е достъпна');
    });

    it('хвърля грешка при 404 (тест не е намерен)', async () => {
        api.post.mockRejectedValueOnce(new Error('Опитът не е намерен.'));

        await expect(gradeAttempt('test-1', 'attempt-1')).rejects.toThrow('Опитът не е намерен.');
    });

    it('хвърля грешка при 401 (не е оторизиран)', async () => {
        api.post.mockRejectedValueOnce(new Error('Unauthorized'));

        await expect(gradeAttempt('test-1', 'attempt-1')).rejects.toThrow('Unauthorized');
    });
});
