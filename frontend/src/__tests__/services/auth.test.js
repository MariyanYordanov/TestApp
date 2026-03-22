// Тестове за services/auth.js

import { createFakeJWT } from '../helpers/jwt.js';

vi.mock('../../services/api.js', () => ({
    api: {
        post: vi.fn(),
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}));

// Импортираме след мокването
const { api } = await import('../../services/api.js');
const { getToken, getUser, isAuthenticated, login, register, logout } = await import('../../services/auth.js');

describe('auth.js — getToken()', () => {
    it('връща null когато няма токен', () => {
        expect(getToken()).toBeNull();
    });

    it('връща токена от localStorage', () => {
        localStorage.setItem('token', 'test-token-123');
        expect(getToken()).toBe('test-token-123');
    });
});

describe('auth.js — getUser()', () => {
    it('връща null когато няма потребител', () => {
        expect(getUser()).toBeNull();
    });

    it('връща обекта с данни за потребителя', () => {
        const user = { id: '1', email: 'test@example.com', fullName: 'Тест Потребител' };
        localStorage.setItem('user', JSON.stringify(user));
        expect(getUser()).toEqual(user);
    });

    it('връща null при невалиден JSON', () => {
        localStorage.setItem('user', 'невалиден-json{{{');
        expect(getUser()).toBeNull();
    });
});

describe('auth.js — isAuthenticated()', () => {
    it('връща false когато няма токен', () => {
        expect(isAuthenticated()).toBe(false);
    });

    it('връща true за валиден неизтекъл токен', () => {
        const token = createFakeJWT({ exp: Math.floor(Date.now() / 1000) + 3600 });
        localStorage.setItem('token', token);
        expect(isAuthenticated()).toBe(true);
    });

    it('връща false за изтекъл токен', () => {
        const token = createFakeJWT({ exp: Math.floor(Date.now() / 1000) - 3600 });
        localStorage.setItem('token', token);
        expect(isAuthenticated()).toBe(false);
    });

    it('връща false за деформиран токен', () => {
        localStorage.setItem('token', 'не.е.валиден');
        expect(isAuthenticated()).toBe(false);
    });

    it('връща false за токен с напълно невалиден base64', () => {
        localStorage.setItem('token', 'aaa.!!!.ccc');
        expect(isAuthenticated()).toBe(false);
    });
});

describe('auth.js — login()', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('хвърля грешка при липсващ email', async () => {
        await expect(login('', 'password123')).rejects.toThrow('Моля въведи email и парола.');
    });

    it('хвърля грешка при липсваща парола', async () => {
        await expect(login('test@example.com', '')).rejects.toThrow('Моля въведи email и парола.');
    });

    it('хвърля грешка при липсващи и двете полета', async () => {
        await expect(login('', '')).rejects.toThrow('Моля въведи email и парола.');
    });

    it('запазва токена и потребителя при успешен вход', async () => {
        const mockResult = {
            token: 'fake-jwt-token',
            user: { id: '1', email: 'test@example.com', fullName: 'Иван Петров' },
        };
        api.post.mockResolvedValueOnce(mockResult);

        await login('test@example.com', 'password123');

        expect(localStorage.getItem('token')).toBe('fake-jwt-token');
        expect(JSON.parse(localStorage.getItem('user'))).toEqual(mockResult.user);
    });

    it('връща резултата от API при успешен вход', async () => {
        const mockResult = {
            token: 'fake-jwt-token',
            user: { id: '1', email: 'test@example.com', fullName: 'Иван Петров' },
        };
        api.post.mockResolvedValueOnce(mockResult);

        const result = await login('test@example.com', 'password123');
        expect(result).toEqual(mockResult);
    });

    it('хвърля грешка при API грешка', async () => {
        api.post.mockRejectedValueOnce(new Error('Грешни данни'));

        await expect(login('test@example.com', 'wrongpass')).rejects.toThrow('Грешни данни');
    });

    it('извиква api.post с правилните параметри', async () => {
        const mockResult = { token: 'tok', user: { id: '1' } };
        api.post.mockResolvedValueOnce(mockResult);

        await login('test@example.com', 'password123');

        expect(api.post).toHaveBeenCalledWith('/auth/login', {
            email: 'test@example.com',
            password: 'password123',
        });
    });
});

describe('auth.js — register()', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('хвърля грешка при липсващ email', async () => {
        await expect(register('', 'password123', 'Иван Петров')).rejects.toThrow('Всички полета са задължителни.');
    });

    it('хвърля грешка при липсваща парола', async () => {
        await expect(register('test@example.com', '', 'Иван Петров')).rejects.toThrow('Всички полета са задължителни.');
    });

    it('хвърля грешка при липсващо пълно име', async () => {
        await expect(register('test@example.com', 'password123', '')).rejects.toThrow('Всички полета са задължителни.');
    });

    it('хвърля грешка при кратка парола', async () => {
        await expect(register('test@example.com', 'short', 'Иван Петров')).rejects.toThrow('Паролата трябва да е поне 8 символа.');
    });

    it('приема парола точно 8 символа', async () => {
        const mockResult = { token: 'tok', user: { id: '1' } };
        api.post.mockResolvedValueOnce(mockResult);

        await expect(register('test@example.com', 'exactly8', 'Иван')).resolves.toEqual(mockResult);
    });

    it('запазва токена и потребителя при успешна регистрация', async () => {
        const mockResult = {
            token: 'new-jwt-token',
            user: { id: '2', email: 'new@example.com', fullName: 'Нов Потребител' },
        };
        api.post.mockResolvedValueOnce(mockResult);

        await register('new@example.com', 'password123', 'Нов Потребител');

        expect(localStorage.getItem('token')).toBe('new-jwt-token');
        expect(JSON.parse(localStorage.getItem('user'))).toEqual(mockResult.user);
    });

    it('хвърля грешка при API грешка', async () => {
        api.post.mockRejectedValueOnce(new Error('Email вече е зает'));

        await expect(register('taken@example.com', 'password123', 'Иван')).rejects.toThrow('Email вече е зает');
    });
});

describe('auth.js — logout()', () => {
    it('изчиства токена от localStorage', () => {
        localStorage.setItem('token', 'some-token');
        logout();
        expect(localStorage.getItem('token')).toBeNull();
    });

    it('изчиства потребителя от localStorage', () => {
        localStorage.setItem('user', JSON.stringify({ id: '1' }));
        logout();
        expect(localStorage.getItem('user')).toBeNull();
    });

    it('работи коректно дори когато localStorage е вече празен', () => {
        expect(() => logout()).not.toThrow();
    });
});
