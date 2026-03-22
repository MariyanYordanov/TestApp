// Тестове за views/homeView.js

vi.mock('../../services/auth.js', () => ({
    isAuthenticated: vi.fn(),
    getToken: vi.fn(),
    getUser: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
}));

const { isAuthenticated } = await import('../../services/auth.js');
const { showHome } = await import('../../views/homeView.js');
const page = (await import('../../lib/page.min.js')).default;

describe('homeView.js — автентикиран потребител', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isAuthenticated.mockReturnValue(true);
    });

    it('пренасочва към /dashboard', () => {
        showHome();
        expect(page.redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('не рендира hero секция', () => {
        showHome();
        const main = document.getElementById('main');
        expect(main.querySelector('.hero')).toBeNull();
    });
});

describe('homeView.js — неавтентикиран потребител', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isAuthenticated.mockReturnValue(false);
        showHome();
    });

    it('рендира hero секцията', () => {
        const main = document.getElementById('main');
        expect(main.querySelector('.hero')).not.toBeNull();
    });

    it('показва hero badge', () => {
        const main = document.getElementById('main');
        const badge = main.querySelector('.hero-badge');
        expect(badge).not.toBeNull();
        expect(badge.textContent).toBe('Платформа за тестове');
    });

    it('показва заглавие "TestApp"', () => {
        const main = document.getElementById('main');
        const title = main.querySelector('.hero-title');
        expect(title).not.toBeNull();
        expect(title.textContent).toBe('TestApp');
    });

    it('рендира 2 бутона за действие', () => {
        const main = document.getElementById('main');
        const actions = main.querySelector('.hero-actions');
        expect(actions.children.length).toBe(2);
    });

    it('показва бутон "Вход за учители"', () => {
        const main = document.getElementById('main');
        const loginBtn = main.querySelector('a[href="/login"]');
        expect(loginBtn).not.toBeNull();
        expect(loginBtn.textContent).toBe('Вход за учители');
    });

    it('показва бутон "Влез в тест с код"', () => {
        const main = document.getElementById('main');
        const buttons = main.querySelectorAll('button');
        const codeBtn = Array.from(buttons).find(b => b.textContent === 'Влез в тест с код');
        expect(codeBtn).toBeDefined();
    });

    it('рендира 3 feature карти', () => {
        const main = document.getElementById('main');
        const cards = main.querySelectorAll('.feature-card');
        expect(cards.length).toBe(3);
    });
});

describe('homeView.js — бутон "Влез в тест с код"', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isAuthenticated.mockReturnValue(false);
        page.redirect.mockReset();
        showHome();
    });

    it('при валиден 8-символен код пренасочва към /test/CODE1234', () => {
        vi.stubGlobal('prompt', vi.fn().mockReturnValue('CODE1234'));
        vi.stubGlobal('alert', vi.fn());

        const main = document.getElementById('main');
        const buttons = main.querySelectorAll('button');
        const codeBtn = Array.from(buttons).find(b => b.textContent === 'Влез в тест с код');
        codeBtn.click();

        expect(page.redirect).toHaveBeenCalledWith('/test/CODE1234');
    });

    it('при код с малки букви ги конвертира в главни', () => {
        vi.stubGlobal('prompt', vi.fn().mockReturnValue('code1234'));
        vi.stubGlobal('alert', vi.fn());

        const main = document.getElementById('main');
        const buttons = main.querySelectorAll('button');
        const codeBtn = Array.from(buttons).find(b => b.textContent === 'Влез в тест с код');
        codeBtn.click();

        expect(page.redirect).toHaveBeenCalledWith('/test/CODE1234');
    });

    it('при кратък код (< 8 символа) показва alert', () => {
        const alertMock = vi.fn();
        vi.stubGlobal('prompt', vi.fn().mockReturnValue('short'));
        vi.stubGlobal('alert', alertMock);

        const main = document.getElementById('main');
        const buttons = main.querySelectorAll('button');
        const codeBtn = Array.from(buttons).find(b => b.textContent === 'Влез в тест с код');
        codeBtn.click();

        expect(alertMock).toHaveBeenCalledWith('Кодът трябва да е точно 8 символа.');
        expect(page.redirect).not.toHaveBeenCalled();
    });

    it('при отказ от prompt (null) нищо не се случва', () => {
        vi.stubGlobal('prompt', vi.fn().mockReturnValue(null));
        vi.stubGlobal('alert', vi.fn());

        const main = document.getElementById('main');
        const buttons = main.querySelectorAll('button');
        const codeBtn = Array.from(buttons).find(b => b.textContent === 'Влез в тест с код');
        codeBtn.click();

        expect(page.redirect).not.toHaveBeenCalled();
    });

    it('при празен низ нищо не се случва', () => {
        vi.stubGlobal('prompt', vi.fn().mockReturnValue(''));
        vi.stubGlobal('alert', vi.fn());

        const main = document.getElementById('main');
        const buttons = main.querySelectorAll('button');
        const codeBtn = Array.from(buttons).find(b => b.textContent === 'Влез в тест с код');
        codeBtn.click();

        expect(page.redirect).not.toHaveBeenCalled();
    });
});
