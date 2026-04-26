// Тестове за services/testService.js

vi.mock('../../services/api.js', () => ({
    api: {
        get:    vi.fn(),
        post:   vi.fn(),
        put:    vi.fn(),
        delete: vi.fn(),
    },
}));

const { api } = await import('../../services/api.js');
const {
    getMyTests,
    createTest,
    getFullTest,
    getPublicTest,
    submitAttempt,
    getAttempts,
    publishTest,
    deleteTest,
} = await import('../../services/testService.js');

beforeEach(() => {
    vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getMyTests
// ---------------------------------------------------------------------------
describe('testService — getMyTests()', () => {
    it('извиква api.get с /tests', async () => {
        api.get.mockResolvedValueOnce([]);

        await getMyTests();

        expect(api.get).toHaveBeenCalledWith('/tests');
    });

    it('връща масив от тестове при успех', async () => {
        const mockTests = [
            { id: 'uuid-1', title: 'Тест по математика', status: 'published' },
            { id: 'uuid-2', title: 'Тест по история',    status: 'draft' },
        ];
        api.get.mockResolvedValueOnce(mockTests);

        const result = await getMyTests();

        expect(result).toEqual(mockTests);
    });

    it('връща празен масив когато API върне []', async () => {
        api.get.mockResolvedValueOnce([]);

        const result = await getMyTests();

        expect(result).toEqual([]);
    });

    it('хвърля грешка при API грешка', async () => {
        api.get.mockRejectedValueOnce(new Error('Грешка при зареждане'));

        await expect(getMyTests()).rejects.toThrow('Грешка при зареждане');
    });
});

// ---------------------------------------------------------------------------
// createTest
// ---------------------------------------------------------------------------
describe('testService — createTest()', () => {
    it('извиква api.post с /tests и трансформиран payload (без durationMinutes)', async () => {
        // createTest конвертира durationMinutes → duration (секунди)
        const testData = { title: 'Нов тест', description: 'Описание', durationMinutes: 30 };
        api.post.mockResolvedValueOnce({ id: 'uuid-3', title: 'Нов тест' });

        await createTest(testData);

        // Проверяваме само URL-а и наличието на duration (не durationMinutes) в payload
        expect(api.post.mock.calls[0][0]).toBe('/tests');
        const postedPayload = api.post.mock.calls[0][1];
        expect(postedPayload.title).toBe('Нов тест');
        expect(postedPayload.duration).toBe(1800);
        expect(Object.keys(postedPayload)).not.toContain('durationMinutes');
    });

    it('връща създадения тест', async () => {
        const testData = { title: 'Нов тест' };
        const created  = { id: 'uuid-3', title: 'Нов тест', status: 'draft' };
        api.post.mockResolvedValueOnce(created);

        const result = await createTest(testData);

        expect(result).toEqual(created);
    });

    it('хвърля грешка при API грешка', async () => {
        api.post.mockRejectedValueOnce(new Error('Невалидни данни'));

        await expect(createTest({ title: '' })).rejects.toThrow('Невалидни данни');
    });
});

// ---------------------------------------------------------------------------
// createTest — конвертира durationMinutes → duration (секунди)
// ---------------------------------------------------------------------------

describe('testService — createTest() durationMinutes → duration конвертиране', () => {
    it('конвертира durationMinutes: 45 → duration: 2700 в payload', async () => {
        api.post.mockResolvedValueOnce({ id: 'uuid-new' });

        await createTest({ durationMinutes: 45, title: 'Тест', questions: [] });

        const postedPayload = api.post.mock.calls[0][1];
        expect(postedPayload.duration).toBe(2700);
    });

    it('payload НЕ съдържа ключ durationMinutes', async () => {
        api.post.mockResolvedValueOnce({ id: 'uuid-new' });

        await createTest({ durationMinutes: 30, title: 'Тест', questions: [] });

        const postedPayload = api.post.mock.calls[0][1];
        expect(Object.keys(postedPayload)).not.toContain('durationMinutes');
    });

    it('конвертира durationMinutes: 1 → duration: 60', async () => {
        api.post.mockResolvedValueOnce({ id: 'uuid-new' });

        await createTest({ durationMinutes: 1, title: 'Тест', questions: [] });

        const postedPayload = api.post.mock.calls[0][1];
        expect(postedPayload.duration).toBe(60);
    });

    it('конвертира durationMinutes: 480 → duration: 28800', async () => {
        api.post.mockResolvedValueOnce({ id: 'uuid-new' });

        await createTest({ durationMinutes: 480, title: 'Тест', questions: [] });

        const postedPayload = api.post.mock.calls[0][1];
        expect(postedPayload.duration).toBe(28800);
    });

    it('запазва останалите полета непроменени', async () => {
        api.post.mockResolvedValueOnce({ id: 'uuid-new' });
        const state = {
            durationMinutes: 30,
            title: 'Моят тест',
            description: 'Описание',
            categoryIds: ['cat-1'],
            questions: [{ text: 'Въпрос?', answers: [] }],
        };

        await createTest(state);

        const postedPayload = api.post.mock.calls[0][1];
        expect(postedPayload.title).toBe('Моят тест');
        expect(postedPayload.description).toBe('Описание');
        expect(postedPayload.categoryIds).toEqual(['cat-1']);
    });
});

// ---------------------------------------------------------------------------
// updateTest — конвертира durationMinutes → duration (секунди)
// ---------------------------------------------------------------------------

describe('testService — updateTest() durationMinutes → duration конвертиране', () => {
    it('конвертира durationMinutes: 45 → duration: 2700 в payload', async () => {
        const { updateTest } = await import('../../services/testService.js');
        api.put.mockResolvedValueOnce({ id: 'uuid-existing' });

        await updateTest('uuid-existing', { durationMinutes: 45, title: 'Тест' });

        const postedPayload = api.put.mock.calls[0][1];
        expect(postedPayload.duration).toBe(2700);
    });

    it('payload НЕ съдържа ключ durationMinutes при updateTest', async () => {
        const { updateTest } = await import('../../services/testService.js');
        api.put.mockResolvedValueOnce({ id: 'uuid-existing' });

        await updateTest('uuid-existing', { durationMinutes: 30, title: 'Тест' });

        const postedPayload = api.put.mock.calls[0][1];
        expect(Object.keys(postedPayload)).not.toContain('durationMinutes');
    });
});

// ---------------------------------------------------------------------------
// getFullTest
// ---------------------------------------------------------------------------
describe('testService — getFullTest()', () => {
    it('извиква api.get с /tests/{testId}', async () => {
        const testId = 'uuid-abc-123';
        api.get.mockResolvedValueOnce({ id: testId, title: 'Тест' });

        await getFullTest(testId);

        expect(api.get).toHaveBeenCalledWith(`/tests/${testId}`);
    });

    it('връща пълния тест с въпроси', async () => {
        const fullTest = {
            id: 'uuid-abc-123',
            title: 'Тест по физика',
            questions: [
                { id: 'q-1', text: 'Какво е скорост?', type: 'closed' },
            ],
        };
        api.get.mockResolvedValueOnce(fullTest);

        const result = await getFullTest('uuid-abc-123');

        expect(result).toEqual(fullTest);
    });

    it('връща null когато тестът не е намерен (404)', async () => {
        api.get.mockResolvedValueOnce(null);

        const result = await getFullTest('nonexistent-id');

        expect(result).toBeNull();
    });

    it('хвърля грешка при API грешка', async () => {
        api.get.mockRejectedValueOnce(new Error('Грешка 500'));

        await expect(getFullTest('some-id')).rejects.toThrow('Грешка 500');
    });
});

// ---------------------------------------------------------------------------
// getPublicTest — публичен endpoint, без JWT
// ---------------------------------------------------------------------------
describe('testService — getPublicTest()', () => {
    it('извиква api.get с /tests/{shareCode}', async () => {
        const shareCode = 'ABCD1234';
        api.get.mockResolvedValueOnce({ shareCode, title: 'Публичен тест' });

        await getPublicTest(shareCode);

        expect(api.get).toHaveBeenCalledWith('/tests/ABCD1234', { skipAuth: true });
    });

    it('връща публичната информация за теста', async () => {
        const publicInfo = {
            shareCode: 'ABCD1234',
            title: 'Тест по химия',
            timeLimitMinutes: 30,
        };
        api.get.mockResolvedValueOnce(publicInfo);

        const result = await getPublicTest('ABCD1234');

        expect(result).toEqual(publicInfo);
    });

    it('връща null ако shareCode-ът не е намерен', async () => {
        api.get.mockResolvedValueOnce(null);

        const result = await getPublicTest('ZZZZZZZZ');

        expect(result).toBeNull();
    });

    it('хвърля грешка при API грешка', async () => {
        api.get.mockRejectedValueOnce(new Error('Тестът не е достъпен'));

        await expect(getPublicTest('ABCD1234')).rejects.toThrow('Тестът не е достъпен');
    });
});

// ---------------------------------------------------------------------------
// submitAttempt — публичен endpoint, без JWT
// ---------------------------------------------------------------------------
describe('testService — submitAttempt()', () => {
    it('извиква api.post с /tests/{shareCode}/attempts и payload', async () => {
        const shareCode = 'ABCD1234';
        const payload   = { participantName: 'Иван Петров', answers: [] };
        api.post.mockResolvedValueOnce({ score: 10, maxScore: 20 });

        await submitAttempt(shareCode, payload);

        expect(api.post).toHaveBeenCalledWith(
            '/tests/ABCD1234/attempts',
            payload,
            { skipAuth: true }
        );
    });

    it('връща резултата от опита', async () => {
        const result = { score: 15, maxScore: 20, passed: true };
        api.post.mockResolvedValueOnce(result);

        const outcome = await submitAttempt('ABCD1234', { participantName: 'Мария' });

        expect(outcome).toEqual(result);
    });

    it('хвърля грешка при API грешка', async () => {
        api.post.mockRejectedValueOnce(new Error('Опитът вече е приключен'));

        await expect(submitAttempt('ABCD1234', {})).rejects.toThrow('Опитът вече е приключен');
    });
});

// ---------------------------------------------------------------------------
// getAttempts
// ---------------------------------------------------------------------------
describe('testService — getAttempts()', () => {
    it('извиква api.get с /tests/{testId}/attempts', async () => {
        const testId = 'uuid-test-1';
        api.get.mockResolvedValueOnce([]);

        await getAttempts(testId);

        expect(api.get).toHaveBeenCalledWith(`/tests/${testId}/attempts`);
    });

    it('връща масив от опити', async () => {
        const attempts = [
            { id: 'att-1', participantName: 'Иван', score: 8 },
            { id: 'att-2', participantName: 'Мария', score: 10 },
        ];
        api.get.mockResolvedValueOnce(attempts);

        const result = await getAttempts('uuid-test-1');

        expect(result).toEqual(attempts);
    });

    it('хвърля грешка при API грешка', async () => {
        api.get.mockRejectedValueOnce(new Error('Нямаш достъп'));

        await expect(getAttempts('uuid-test-1')).rejects.toThrow('Нямаш достъп');
    });
});

// ---------------------------------------------------------------------------
// publishTest
// ---------------------------------------------------------------------------
describe('testService — publishTest()', () => {
    it('извиква api.put с /tests/{testId}/publish', async () => {
        const testId = 'uuid-test-1';
        api.put.mockResolvedValueOnce({ id: testId, status: 'published' });

        await publishTest(testId);

        expect(api.put).toHaveBeenCalledWith(`/tests/${testId}/publish`);
    });

    it('връща обновения тест след публикуване', async () => {
        const published = { id: 'uuid-test-1', status: 'published' };
        api.put.mockResolvedValueOnce(published);

        const result = await publishTest('uuid-test-1');

        expect(result).toEqual(published);
    });

    it('хвърля грешка при API грешка', async () => {
        api.put.mockRejectedValueOnce(new Error('Тестът вече е публикуван'));

        await expect(publishTest('uuid-test-1')).rejects.toThrow('Тестът вече е публикуван');
    });
});

// ---------------------------------------------------------------------------
// deleteTest
// ---------------------------------------------------------------------------
describe('testService — deleteTest()', () => {
    it('извиква api.delete с /tests/{testId}', async () => {
        const testId = 'uuid-test-1';
        api.delete.mockResolvedValueOnce(null);

        await deleteTest(testId);

        expect(api.delete).toHaveBeenCalledWith(`/tests/${testId}`);
    });

    it('връща null при успешно изтриване', async () => {
        api.delete.mockResolvedValueOnce(null);

        const result = await deleteTest('uuid-test-1');

        expect(result).toBeNull();
    });

    it('хвърля грешка при API грешка', async () => {
        api.delete.mockRejectedValueOnce(new Error('Нямаш право да изтриеш теста'));

        await expect(deleteTest('uuid-test-1')).rejects.toThrow('Нямаш право да изтриеш теста');
    });
});
