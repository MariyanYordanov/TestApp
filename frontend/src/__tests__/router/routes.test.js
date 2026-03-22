// Тестове за router/routes.js

vi.mock('../../services/auth.js', () => ({
    isAuthenticated: vi.fn(),
    getToken: vi.fn(),
    getUser: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
}));

// Мокираме всички view импорти за да не падне routes.js при зареждане
vi.mock('../../views/homeView.js', () => ({ showHome: vi.fn() }));
vi.mock('../../views/loginView.js', () => ({ showLogin: vi.fn() }));
vi.mock('../../views/registerView.js', () => ({ showRegister: vi.fn() }));
vi.mock('../../views/dashboardView.js', () => ({ showDashboard: vi.fn() }));
vi.mock('../../views/createTestView.js', () => ({ showCreateTest: vi.fn() }));
vi.mock('../../views/testDetailsView.js', () => ({ showTestDetails: vi.fn() }));
vi.mock('../../views/categoriesView.js', () => ({ showCategories: vi.fn() }));
vi.mock('../../views/statisticsView.js', () => ({ showStatistics: vi.fn() }));
vi.mock('../../views/accountView.js', () => ({ showAccount: vi.fn() }));
vi.mock('../../views/participant/testEntryView.js', () => ({ showTestEntry: vi.fn() }));
vi.mock('../../views/participant/testTakingView.js', () => ({ showTestTaking: vi.fn() }));

const { isAuthenticated } = await import('../../services/auth.js');
const { authGuard } = await import('../../router/routes.js');
const page = (await import('../../lib/page.min.js')).default;

describe('authGuard() — неавтентикиран потребител', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isAuthenticated.mockReturnValue(false);
        page.redirect.mockReset();
    });

    it('пренасочва към /login', () => {
        const next = vi.fn();
        authGuard({}, next);
        expect(page.redirect).toHaveBeenCalledWith('/login');
    });

    it('не извиква next()', () => {
        const next = vi.fn();
        authGuard({}, next);
        expect(next).not.toHaveBeenCalled();
    });
});

describe('authGuard() — автентикиран потребител', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isAuthenticated.mockReturnValue(true);
        page.redirect.mockReset();
    });

    it('извиква next()', () => {
        const next = vi.fn();
        authGuard({}, next);
        expect(next).toHaveBeenCalledOnce();
    });

    it('не пренасочва към /login', () => {
        const next = vi.fn();
        authGuard({}, next);
        expect(page.redirect).not.toHaveBeenCalled();
    });
});
