// Тестове за utils/nav.js

vi.mock('../../services/auth.js', () => ({
    isAuthenticated: vi.fn(),
    logout: vi.fn(),
    getUser: vi.fn(),
    getToken: vi.fn(),
}));

const { isAuthenticated, logout, getUser } = await import('../../services/auth.js');
const { updateNav, buildNavList, buildHeader, buildFooter } = await import('../../utils/nav.js');
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
