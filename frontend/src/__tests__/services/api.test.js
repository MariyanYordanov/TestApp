// Тестове за services/api.js

vi.mock('../../services/auth.js', () => ({
    getToken: vi.fn(),
    getUser: vi.fn(),
    isAuthenticated: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
}));

const { getToken } = await import('../../services/auth.js');
const { api } = await import('../../services/api.js');

// Импортираме page mock-а директно
const page = (await import('../../lib/page.min.js')).default;

// Помощна функция за изграждане на mock Response
function makeMockResponse(status, body = null) {
    return {
        status,
        ok: status >= 200 && status < 300,
        json: vi.fn().mockResolvedValue(body ?? {}),
    };
}

describe('api.js — GET заявки', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getToken.mockReturnValue(null);
    });

    it('изпраща GET заявка към правилния URL', async () => {
        const mockFetch = vi.fn().mockResolvedValue(makeMockResponse(200, { data: 'test' }));
        vi.stubGlobal('fetch', mockFetch);

        await api.get('/tests');

        expect(mockFetch).toHaveBeenCalledWith(
            'http://localhost:5000/api/tests',
            expect.objectContaining({ method: 'GET' })
        );
    });

    it('добавя Authorization header когато има токен', async () => {
        getToken.mockReturnValue('my-jwt-token');
        const mockFetch = vi.fn().mockResolvedValue(makeMockResponse(200, { data: 'ok' }));
        vi.stubGlobal('fetch', mockFetch);

        await api.get('/tests');

        const [, options] = mockFetch.mock.calls[0];
        expect(options.headers['Authorization']).toBe('Bearer my-jwt-token');
    });

    it('не добавя Authorization header когато няма токен', async () => {
        getToken.mockReturnValue(null);
        const mockFetch = vi.fn().mockResolvedValue(makeMockResponse(200, { data: 'ok' }));
        vi.stubGlobal('fetch', mockFetch);

        await api.get('/tests');

        const [, options] = mockFetch.mock.calls[0];
        expect(options.headers['Authorization']).toBeUndefined();
    });

    it('връща JSON данните при успешна 200 заявка', async () => {
        const mockFetch = vi.fn().mockResolvedValue(makeMockResponse(200, { id: '1', title: 'Тест' }));
        vi.stubGlobal('fetch', mockFetch);

        const result = await api.get('/tests/1');
        expect(result).toEqual({ id: '1', title: 'Тест' });
    });
});

describe('api.js — POST заявки', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getToken.mockReturnValue(null);
    });

    it('изпраща POST заявка с правилния body', async () => {
        const mockFetch = vi.fn().mockResolvedValue(makeMockResponse(200, { id: '1' }));
        vi.stubGlobal('fetch', mockFetch);

        await api.post('/tests', { title: 'Нов тест' });

        const [, options] = mockFetch.mock.calls[0];
        expect(options.method).toBe('POST');
        expect(options.body).toBe(JSON.stringify({ title: 'Нов тест' }));
    });

    it('задава Content-Type: application/json', async () => {
        const mockFetch = vi.fn().mockResolvedValue(makeMockResponse(200, {}));
        vi.stubGlobal('fetch', mockFetch);

        await api.post('/tests', {});

        const [, options] = mockFetch.mock.calls[0];
        expect(options.headers['Content-Type']).toBe('application/json');
    });
});

describe('api.js — PUT заявки', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getToken.mockReturnValue(null);
    });

    it('изпраща PUT заявка с правилния метод', async () => {
        const mockFetch = vi.fn().mockResolvedValue(makeMockResponse(200, { updated: true }));
        vi.stubGlobal('fetch', mockFetch);

        await api.put('/tests/1', { title: 'Обновен тест' });

        const [, options] = mockFetch.mock.calls[0];
        expect(options.method).toBe('PUT');
    });
});

describe('api.js — DELETE заявки', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getToken.mockReturnValue(null);
    });

    it('изпраща DELETE заявка с правилния метод', async () => {
        const mockFetch = vi.fn().mockResolvedValue(makeMockResponse(204));
        vi.stubGlobal('fetch', mockFetch);

        await api.delete('/tests/1');

        const [, options] = mockFetch.mock.calls[0];
        expect(options.method).toBe('DELETE');
    });
});

describe('api.js — обработка на специални статус кодове', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getToken.mockReturnValue(null);
        page.redirect.mockReset();
    });

    it('401 → изчиства localStorage, пренасочва към /login и хвърля грешка', async () => {
        const mockFetch = vi.fn().mockResolvedValue(makeMockResponse(401));
        vi.stubGlobal('fetch', mockFetch);
        localStorage.setItem('token', 'expired-token');
        localStorage.setItem('user', '{}');

        await expect(api.get('/protected')).rejects.toThrow('Сесията е изтекла. Моля влез отново.');

        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('user')).toBeNull();
        expect(page.redirect).toHaveBeenCalledWith('/login');
    });

    it('404 → връща null', async () => {
        const mockFetch = vi.fn().mockResolvedValue(makeMockResponse(404));
        vi.stubGlobal('fetch', mockFetch);

        const result = await api.get('/tests/nonexistent');
        expect(result).toBeNull();
    });

    it('204 → връща null', async () => {
        const mockFetch = vi.fn().mockResolvedValue(makeMockResponse(204));
        vi.stubGlobal('fetch', mockFetch);

        const result = await api.delete('/tests/1');
        expect(result).toBeNull();
    });

    it('500 → хвърля грешка с message от API', async () => {
        const response = makeMockResponse(500, { message: 'Вътрешна сървърна грешка' });
        const mockFetch = vi.fn().mockResolvedValue(response);
        vi.stubGlobal('fetch', mockFetch);

        await expect(api.get('/tests')).rejects.toThrow('Вътрешна сървърна грешка');
    });

    it('500 без message → хвърля грешка с кода', async () => {
        const response = {
            status: 500,
            ok: false,
            json: vi.fn().mockResolvedValue({}),
        };
        const mockFetch = vi.fn().mockResolvedValue(response);
        vi.stubGlobal('fetch', mockFetch);

        await expect(api.get('/tests')).rejects.toThrow('Грешка 500');
    });

    it('400 с message → хвърля грешката от API', async () => {
        const response = makeMockResponse(400, { message: 'Невалидни данни' });
        const mockFetch = vi.fn().mockResolvedValue(response);
        vi.stubGlobal('fetch', mockFetch);

        await expect(api.post('/tests', {})).rejects.toThrow('Невалидни данни');
    });
});

describe('api.js — мрежова грешка', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getToken.mockReturnValue(null);
    });

    it('хвърля грешка при мрежов проблем', async () => {
        const mockFetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
        vi.stubGlobal('fetch', mockFetch);

        await expect(api.get('/tests')).rejects.toThrow('Няма връзка със сървъра. Провери дали backend-ът работи.');
    });
});
