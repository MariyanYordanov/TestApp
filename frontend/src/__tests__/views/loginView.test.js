// Тестове за views/loginView.js

vi.mock('../../services/auth.js', () => ({
    isAuthenticated: vi.fn(),
    login: vi.fn(),
    getToken: vi.fn(),
    getUser: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
}));

const { isAuthenticated, login } = await import('../../services/auth.js');
const { showLogin } = await import('../../views/loginView.js');
const page = (await import('../../lib/page.min.js')).default;

// Изчаква завършването на всички pending Promise микрозадачи
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

describe('loginView.js — автентикиран потребител', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        isAuthenticated.mockReturnValue(true);
    });

    it('пренасочва към /dashboard', () => {
        showLogin();
        expect(page.redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('не рендира форма', () => {
        showLogin();
        const main = document.getElementById('main');
        expect(main.querySelector('form')).toBeNull();
    });
});

describe('loginView.js — рендиране', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        isAuthenticated.mockReturnValue(false);
        showLogin();
    });

    it('рендира form с id login-form', () => {
        const main = document.getElementById('main');
        expect(main.querySelector('#login-form')).not.toBeNull();
    });

    it('рендира поле за email', () => {
        const main = document.getElementById('main');
        expect(main.querySelector('#email')).not.toBeNull();
    });

    it('рендира поле за парола', () => {
        const main = document.getElementById('main');
        expect(main.querySelector('#password')).not.toBeNull();
    });

    it('рендира submit бутон', () => {
        const main = document.getElementById('main');
        const btn = main.querySelector('button[type="submit"]');
        expect(btn).not.toBeNull();
        expect(btn.textContent).toBe('Влез');
    });

    it('рендира error елемент скрит по подразбиране', () => {
        const main = document.getElementById('main');
        const error = main.querySelector('#login-error');
        expect(error).not.toBeNull();
        expect(error.style.display).toBe('none');
    });
});

describe('loginView.js — submit успех', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isAuthenticated.mockReturnValue(false);
        page.redirect.mockReset();
        showLogin();
    });

    it('извиква login() с правилните данни', async () => {
        login.mockResolvedValueOnce({ token: 'tok', user: {} });

        const main = document.getElementById('main');
        main.querySelector('#email').value = 'test@example.com';
        main.querySelector('#password').value = 'password123';

        const form = main.querySelector('#login-form');
        form.dispatchEvent(new Event('submit'));

        // Изчакваме async операцията
        await flushPromises();

        expect(login).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('пренасочва към /dashboard след успешен вход', async () => {
        login.mockResolvedValueOnce({ token: 'tok', user: {} });

        const main = document.getElementById('main');
        main.querySelector('#email').value = 'test@example.com';
        main.querySelector('#password').value = 'password123';

        const form = main.querySelector('#login-form');
        form.dispatchEvent(new Event('submit'));

        await flushPromises();

        expect(page.redirect).toHaveBeenCalledWith('/dashboard');
    });
});

describe('loginView.js — submit грешка', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        isAuthenticated.mockReturnValue(false);
        showLogin();
    });

    it('показва error message при грешка', async () => {
        login.mockRejectedValueOnce(new Error('Грешен email или парола'));

        const main = document.getElementById('main');
        main.querySelector('#email').value = 'wrong@example.com';
        main.querySelector('#password').value = 'wrongpass';

        const form = main.querySelector('#login-form');
        form.dispatchEvent(new Event('submit'));

        await flushPromises();

        const error = main.querySelector('#login-error');
        expect(error.style.display).toBe('block');
        expect(error.textContent).toBe('Грешен email или парола');
    });

    it('ре-активира бутона след грешка', async () => {
        login.mockRejectedValueOnce(new Error('Грешка'));

        const main = document.getElementById('main');
        main.querySelector('#email').value = 'test@example.com';
        main.querySelector('#password').value = 'pass';

        const form = main.querySelector('#login-form');
        form.dispatchEvent(new Event('submit'));

        await flushPromises();

        const btn = main.querySelector('button[type="submit"]');
        expect(btn.disabled).toBe(false);
        expect(btn.textContent).toBe('Влез');
    });
});
