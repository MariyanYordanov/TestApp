// Тестове за safeRender wrapper в routes.js
// Стъпка 59 — safeRender.test.js

vi.mock('../../services/auth.js', () => ({
    isAuthenticated: vi.fn(),
    getToken: vi.fn(),
    getUser: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
}));

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

const { safeRender } = await import('../../router/routes.js');

describe('safeRender — успешно изпълнение', () => {
    it('извиква viewFn с ctx', async () => {
        const viewFn = vi.fn().mockResolvedValue(undefined);
        const ctx = { params: { id: '1' } };
        await safeRender(viewFn, ctx);
        expect(viewFn).toHaveBeenCalledWith(ctx);
    });

    it('не показва error-card при успешно изпълнение', async () => {
        const viewFn = vi.fn().mockResolvedValue(undefined);
        const main = document.getElementById('main');
        main.innerHTML = '<div class="content">Съдържание</div>';
        await safeRender(viewFn, {});
        expect(main.querySelector('.error-card')).toBeNull();
    });
});

describe('safeRender — грешка в viewFn', () => {
    beforeEach(() => {
        const main = document.getElementById('main');
        main.innerHTML = '';
    });

    it('показва .error-card при хвърлена грешка', async () => {
        const viewFn = vi.fn().mockRejectedValue(new Error('Тестова грешка'));
        const main = document.getElementById('main');
        await safeRender(viewFn, {});
        expect(main.querySelector('.error-card')).not.toBeNull();
    });

    it('показва съобщение за грешка на български', async () => {
        const viewFn = vi.fn().mockRejectedValue(new Error('Критична грешка'));
        const main = document.getElementById('main');
        await safeRender(viewFn, {});
        expect(main.textContent).toContain('Нещо се обърка');
    });

    it('показва линк към началото', async () => {
        const viewFn = vi.fn().mockRejectedValue(new Error('Грешка'));
        const main = document.getElementById('main');
        await safeRender(viewFn, {});
        const link = main.querySelector('a[href="/"]');
        expect(link).not.toBeNull();
    });

    it('работи и при синхронно хвърлена грешка', async () => {
        const viewFn = vi.fn().mockImplementation(() => { throw new Error('Sync error'); });
        const main = document.getElementById('main');
        await safeRender(viewFn, {});
        expect(main.querySelector('.error-card')).not.toBeNull();
    });

    it('не хвърля нагоре при грешка в viewFn', async () => {
        const viewFn = vi.fn().mockRejectedValue(new Error('Грешка'));
        await expect(safeRender(viewFn, {})).resolves.not.toThrow();
    });
});
