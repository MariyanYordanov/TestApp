// Тестове за utils/nav.js

vi.mock('../../services/auth.js', () => ({
    isAuthenticated: vi.fn(),
    logout: vi.fn(),
    getUser: vi.fn(),
    getToken: vi.fn(),
}));

const { isAuthenticated, logout, getUser } = await import('../../services/auth.js');
const { updateNav, buildNavList, buildHeader, buildFooter, setupMobileNav } = await import('../../utils/nav.js');
const page = (await import('../../lib/page.min.js')).default;

describe('updateNav() — неавтентикиран потребител', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isAuthenticated.mockReturnValue(false);
        getUser.mockReturnValue(null);
        // Нулираме sidebar-а
        const sidebar = document.getElementById('sidebar');
        sidebar.style.display = '';
        sidebar.replaceChildren();
    });

    it('скрива sidebar-а', () => {
        updateNav('/');
        const sidebar = document.getElementById('sidebar');
        expect(sidebar.style.display).toBe('none');
    });

    it('изчиства съдържанието на sidebar-а', () => {
        const sidebar = document.getElementById('sidebar');
        sidebar.innerHTML = '<p>стар контент</p>';
        updateNav('/');
        expect(sidebar.children.length).toBe(0);
    });
});

describe('updateNav() — автентикиран потребител', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isAuthenticated.mockReturnValue(true);
        getUser.mockReturnValue({ id: '1', email: 'test@example.com', fullName: 'Иван Петров' });
    });

    it('показва sidebar-а', () => {
        updateNav('/dashboard');
        const sidebar = document.getElementById('sidebar');
        expect(sidebar.style.display).toBe('flex');
    });

    it('изгражда съдържание в sidebar-а', () => {
        updateNav('/dashboard');
        const sidebar = document.getElementById('sidebar');
        expect(sidebar.children.length).toBeGreaterThan(0);
    });
});

describe('buildNavList() — активен елемент', () => {
    it('маркира елемента за текущия path като active', () => {
        const ul = buildNavList('/dashboard');
        const activeItems = ul.querySelectorAll('.nav-item.active');
        expect(activeItems.length).toBe(1);
        expect(activeItems[0].querySelector('a').getAttribute('href')).toBe('/dashboard');
    });

    it('не маркира нищо като active при непознат path', () => {
        const ul = buildNavList('/nonexistent');
        const activeItems = ul.querySelectorAll('.nav-item.active');
        expect(activeItems.length).toBe(0);
    });

    it('съдържа всички навигационни елементи', () => {
        const ul = buildNavList('/dashboard');
        const items = ul.querySelectorAll('.nav-item');
        expect(items.length).toBe(4);
    });

    it('маркира /categories като active', () => {
        const ul = buildNavList('/categories');
        const activeItems = ul.querySelectorAll('.nav-item.active');
        expect(activeItems[0].querySelector('a').getAttribute('href')).toBe('/categories');
    });
});

describe('buildHeader()', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getUser.mockReturnValue({ id: '1', fullName: 'Петър Иванов' });
    });

    it('съдържа "TestApp" заглавие', () => {
        const header = buildHeader();
        expect(header.querySelector('h2').textContent).toBe('TestApp');
    });

    it('показва пълното ime на потребителя', () => {
        const header = buildHeader();
        const userName = header.querySelector('.nav-user');
        expect(userName.textContent).toBe('Петър Иванов');
    });

    it('показва празен низ когато потребителят е null', () => {
        getUser.mockReturnValue(null);
        const header = buildHeader();
        const userName = header.querySelector('.nav-user');
        expect(userName.textContent).toBe('');
    });
});

describe('setupMobileNav() — hamburger toggle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Изчистваме body от предишни toggle бутони
        document.querySelectorAll('.mobile-nav-toggle').forEach(el => el.remove());
        document.body.classList.remove('sidebar-open');
    });

    afterEach(() => {
        document.querySelectorAll('.mobile-nav-toggle').forEach(el => el.remove());
        document.body.classList.remove('sidebar-open');
    });

    it('не създава toggle бутон при неавтентикиран потребител', () => {
        isAuthenticated.mockReturnValue(false);
        setupMobileNav();
        expect(document.querySelector('.mobile-nav-toggle')).toBeNull();
    });

    it('създава toggle бутон при автентикиран потребител', () => {
        isAuthenticated.mockReturnValue(true);
        setupMobileNav();
        expect(document.querySelector('.mobile-nav-toggle')).not.toBeNull();
    });

    it('toggle бутонът добавя sidebar-open към body при клик', () => {
        isAuthenticated.mockReturnValue(true);
        setupMobileNav();
        const btn = document.querySelector('.mobile-nav-toggle');
        btn.click();
        expect(document.body.classList.contains('sidebar-open')).toBe(true);
    });

    it('toggle бутонът премахва sidebar-open при втори клик', () => {
        isAuthenticated.mockReturnValue(true);
        setupMobileNav();
        const btn = document.querySelector('.mobile-nav-toggle');
        btn.click();
        btn.click();
        expect(document.body.classList.contains('sidebar-open')).toBe(false);
    });

    it('клик извън sidebar затваря менюто', () => {
        isAuthenticated.mockReturnValue(true);
        setupMobileNav();
        const btn = document.querySelector('.mobile-nav-toggle');
        btn.click();
        expect(document.body.classList.contains('sidebar-open')).toBe(true);

        // Симулираме клик върху body (извън sidebar и toggle)
        const event = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(event, 'target', { value: document.body });
        document.body.dispatchEvent(event);
        expect(document.body.classList.contains('sidebar-open')).toBe(false);
    });

    it('не създава дублиращ се бутон при повторно извикване', () => {
        isAuthenticated.mockReturnValue(true);
        setupMobileNav();
        setupMobileNav();
        const btns = document.querySelectorAll('.mobile-nav-toggle');
        expect(btns.length).toBe(1);
    });
});

describe('buildFooter() — бутон Изход', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        logout.mockReset();
    });

    it('съдържа бутон "Изход"', () => {
        const footer = buildFooter();
        const btn = footer.querySelector('.btn-logout');
        expect(btn).not.toBeNull();
        expect(btn.textContent).toBe('Изход');
    });

    it('при клик извиква logout()', () => {
        const footer = buildFooter();
        const btn = footer.querySelector('.btn-logout');
        btn.click();
        expect(logout).toHaveBeenCalledOnce();
    });

    it('при клик пренасочва към /', () => {
        const footer = buildFooter();
        const btn = footer.querySelector('.btn-logout');
        btn.click();
        expect(page.redirect).toHaveBeenCalledWith('/');
    });
});
