// Тестове за views/registerView.js

vi.mock('../../services/auth.js', () => ({
    isAuthenticated: vi.fn(),
    register: vi.fn(),
    getToken: vi.fn(),
    getUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
}));

const { isAuthenticated, register } = await import('../../services/auth.js');
const { showRegister } = await import('../../views/registerView.js');
const page = (await import('../../lib/page.min.js')).default;

// Изчаква завършването на всички pending Promise микрозадачи
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

describe('registerView.js — автентикиран потребител', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isAuthenticated.mockReturnValue(true);
    });

    it('пренасочва към /dashboard', () => {
        showRegister();
        expect(page.redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('не рендира форма', () => {
        showRegister();
        const main = document.getElementById('main');
        expect(main.querySelector('form')).toBeNull();
    });
});

describe('registerView.js — рендиране', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isAuthenticated.mockReturnValue(false);
        showRegister();
    });

    it('рендира form с id register-form', () => {
        const main = document.getElementById('main');
        expect(main.querySelector('#register-form')).not.toBeNull();
    });

    it('рендира поле за пълно ime', () => {
        const main = document.getElementById('main');
        expect(main.querySelector('#fullName')).not.toBeNull();
    });

    it('рендира поле за email', () => {
        const main = document.getElementById('main');
        expect(main.querySelector('#email')).not.toBeNull();
    });

    it('рендира поле за парола', () => {
        const main = document.getElementById('main');
        expect(main.querySelector('#password')).not.toBeNull();
    });

    it('рендира поле за потвърждение на парола', () => {
        const main = document.getElementById('main');
        expect(main.querySelector('#confirm')).not.toBeNull();
    });

    it('рендира submit бутон', () => {
        const main = document.getElementById('main');
        const btn = main.querySelector('button[type="submit"]');
        expect(btn).not.toBeNull();
        expect(btn.textContent).toBe('Създай акаунт');
    });
});

describe('registerView.js — валидация на пароли', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isAuthenticated.mockReturnValue(false);
        showRegister();
    });

    it('показва грешка когато паролите не съвпадат', async () => {
        const main = document.getElementById('main');
        main.querySelector('#fullName').value = 'Иван Петров';
        main.querySelector('#email').value = 'ivan@example.com';
        main.querySelector('#password').value = 'password123';
        main.querySelector('#confirm').value = 'different456';

        const form = main.querySelector('#register-form');
        form.dispatchEvent(new Event('submit'));

        await flushPromises();

        const error = main.querySelector('#register-error');
        expect(error.style.display).toBe('block');
        expect(error.textContent).toBe('Паролите не съвпадат.');
    });

    it('не извиква register() когато паролите не съвпадат', async () => {
        const main = document.getElementById('main');
        main.querySelector('#fullName').value = 'Иван Петров';
        main.querySelector('#email').value = 'ivan@example.com';
        main.querySelector('#password').value = 'password123';
        main.querySelector('#confirm').value = 'different456';

        const form = main.querySelector('#register-form');
        form.dispatchEvent(new Event('submit'));

        await flushPromises();

        expect(register).not.toHaveBeenCalled();
    });
});

describe('registerView.js — успешна регистрация', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isAuthenticated.mockReturnValue(false);
        page.redirect.mockReset();
        showRegister();
    });

    it('извиква register() с правилните данни', async () => {
        register.mockResolvedValueOnce({ token: 'tok', user: {} });

        const main = document.getElementById('main');
        main.querySelector('#fullName').value = 'Иван Петров';
        main.querySelector('#email').value = 'ivan@example.com';
        main.querySelector('#password').value = 'password123';
        main.querySelector('#confirm').value = 'password123';

        const form = main.querySelector('#register-form');
        form.dispatchEvent(new Event('submit'));

        await flushPromises();

        expect(register).toHaveBeenCalledWith('ivan@example.com', 'password123', 'Иван Петров');
    });

    it('пренасочва към /dashboard след успешна регистрация', async () => {
        register.mockResolvedValueOnce({ token: 'tok', user: {} });

        const main = document.getElementById('main');
        main.querySelector('#fullName').value = 'Иван Петров';
        main.querySelector('#email').value = 'ivan@example.com';
        main.querySelector('#password').value = 'password123';
        main.querySelector('#confirm').value = 'password123';

        const form = main.querySelector('#register-form');
        form.dispatchEvent(new Event('submit'));

        await flushPromises();

        expect(page.redirect).toHaveBeenCalledWith('/dashboard');
    });
});

describe('registerView.js — грешка от API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isAuthenticated.mockReturnValue(false);
        showRegister();
    });

    it('показва error message при API грешка', async () => {
        register.mockRejectedValueOnce(new Error('Email вече е зает'));

        const main = document.getElementById('main');
        main.querySelector('#fullName').value = 'Иван Петров';
        main.querySelector('#email').value = 'taken@example.com';
        main.querySelector('#password').value = 'password123';
        main.querySelector('#confirm').value = 'password123';

        const form = main.querySelector('#register-form');
        form.dispatchEvent(new Event('submit'));

        await flushPromises();

        const error = main.querySelector('#register-error');
        expect(error.style.display).toBe('block');
        expect(error.textContent).toBe('Email вече е зает');
    });

    it('ре-активира бутона след API грешка', async () => {
        register.mockRejectedValueOnce(new Error('Грешка'));

        const main = document.getElementById('main');
        main.querySelector('#fullName').value = 'Иван Петров';
        main.querySelector('#email').value = 'test@example.com';
        main.querySelector('#password').value = 'password123';
        main.querySelector('#confirm').value = 'password123';

        const form = main.querySelector('#register-form');
        form.dispatchEvent(new Event('submit'));

        await flushPromises();

        const btn = main.querySelector('button[type="submit"]');
        expect(btn.disabled).toBe(false);
        expect(btn.textContent).toBe('Създай акаунт');
    });
});
