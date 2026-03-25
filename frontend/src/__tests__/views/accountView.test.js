// Тестове за views/accountView.js
// Стъпка 61 — accountView.test.js

vi.mock('../../services/auth.js', () => ({
    getUser: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: vi.fn(),
    getToken: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
}));

const { getUser, logout } = await import('../../services/auth.js');
const page = (await import('../../lib/page.min.js')).default;
const { showAccount } = await import('../../views/accountView.js');

describe('accountView — пренасочване при липса на потребител', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        page.redirect.mockReset();
    });

    it('пренасочва към /login ако няма потребител', () => {
        getUser.mockReturnValue(null);
        showAccount({});
        expect(page.redirect).toHaveBeenCalledWith('/login');
    });

    it('не рендира съдържание ако няма потребител', () => {
        getUser.mockReturnValue(null);
        const main = document.getElementById('main');
        main.innerHTML = '';
        showAccount({});
        expect(main.querySelector('.account-page')).toBeNull();
    });
});

describe('accountView — рендиране с потребителски данни', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        getUser.mockReturnValue({ email: 'teacher@test.com', fullName: 'Иван Иванов' });
        showAccount({});
    });

    it('рендира .account-page', () => {
        const main = document.getElementById('main');
        expect(main.querySelector('.account-page')).not.toBeNull();
    });

    it('рендира h1 "Акаунт"', () => {
        const main = document.getElementById('main');
        const h1 = main.querySelector('h1');
        expect(h1).not.toBeNull();
        expect(h1.textContent).toBe('Акаунт');
    });

    it('показва email адреса на потребителя', () => {
        const main = document.getElementById('main');
        expect(main.textContent).toContain('teacher@test.com');
    });

    it('показва пълното ime на потребителя', () => {
        const main = document.getElementById('main');
        expect(main.textContent).toContain('Иван Иванов');
    });

    it('рендира бутон "Изход от акаунта"', () => {
        const main = document.getElementById('main');
        const btn = Array.from(main.querySelectorAll('button'))
            .find(b => b.textContent === 'Изход от акаунта');
        expect(btn).not.toBeNull();
    });

    it('не пренасочва при рендиране', () => {
        expect(page.redirect).not.toHaveBeenCalled();
    });
});

describe('accountView — logout бутон', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        getUser.mockReturnValue({ email: 'teacher@test.com', fullName: 'Тест Потребител' });
        showAccount({});
    });

    it('извиква logout() при клик на бутона', () => {
        const main = document.getElementById('main');
        const btn = Array.from(main.querySelectorAll('button'))
            .find(b => b.textContent === 'Изход от акаунта');
        btn.click();
        expect(logout).toHaveBeenCalledOnce();
    });

    it('пренасочва към / след logout', () => {
        const main = document.getElementById('main');
        const btn = Array.from(main.querySelectorAll('button'))
            .find(b => b.textContent === 'Изход от акаунта');
        btn.click();
        expect(page.redirect).toHaveBeenCalledWith('/');
    });
});

describe('accountView — XSS защита', () => {
    it('не изпълнява HTML в потребителските данни', () => {
        vi.clearAllMocks();
        getUser.mockReturnValue({
            email: '<script>alert("xss")</script>',
            fullName: '<b>Bold</b>',
        });
        showAccount({});
        const main = document.getElementById('main');
        // Не трябва да има HTML тагове в DOM-а от потребителски данни
        expect(main.querySelector('script')).toBeNull();
        expect(main.querySelector('b')).toBeNull();
        // Стринговете трябва да се показват като текст
        expect(main.textContent).toContain('<script>alert("xss")</script>');
    });
});

describe('accountView — потребител с name вместо fullName', () => {
    it('показва name ако fullName е undefined', () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        getUser.mockReturnValue({ email: 'user@test.com', name: 'Мария' });
        showAccount({});
        const main = document.getElementById('main');
        expect(main.textContent).toContain('Мария');
    });
});
