// Тестове за views/categoriesView.js
// Стъпка 52 — categoriesView.test.js

vi.mock('../../services/categoryService.js', () => ({
    getCategories: vi.fn(),
    createCategory: vi.fn(),
    deleteCategory: vi.fn(),
}));

vi.mock('../../utils/notification.js', () => ({
    showToast: vi.fn(),
}));

const { showCategories } = await import('../../views/categoriesView.js');
const categoryService = await import('../../services/categoryService.js');
const { showToast } = await import('../../utils/notification.js');

// ---------------------------------------------------------------------------
// Помощни данни
// ---------------------------------------------------------------------------

const MOCK_CATEGORIES = [
    { id: 'c1', name: 'Математика' },
    { id: 'c2', name: 'Физика' },
    { id: 'c3', name: 'Химия' },
];

// ---------------------------------------------------------------------------
// categoriesView — loading state
// ---------------------------------------------------------------------------

describe('categoriesView — loading state', () => {
    it('показва loading съобщение преди fetch', async () => {
        categoryService.getCategories.mockReturnValue(new Promise(() => {}));
        showCategories({});
        const loading = document.getElementById('main').querySelector('.loading');
        expect(loading).not.toBeNull();
    });
});

// ---------------------------------------------------------------------------
// categoriesView — рендиране
// ---------------------------------------------------------------------------

describe('categoriesView — рендиране', () => {
    beforeEach(async () => {
        categoryService.getCategories.mockResolvedValue(MOCK_CATEGORIES);
        showCategories({});
        await vi.waitUntil(() => document.getElementById('main').querySelector('h1'));
    });

    it('рендира заглавие "Управление на категории"', () => {
        const main = document.getElementById('main');
        const h1 = main.querySelector('h1');
        expect(h1).not.toBeNull();
        expect(h1.textContent).toBe('Управление на категории');
    });

    it('рендира формата за добавяне', () => {
        const main = document.getElementById('main');
        const input = main.querySelector('input');
        expect(input).not.toBeNull();
    });

    it('рендира бутон "Добави"', () => {
        const main = document.getElementById('main');
        const buttons = Array.from(main.querySelectorAll('button'));
        const addBtn = buttons.find(b => b.textContent.includes('Добави'));
        expect(addBtn).toBeDefined();
    });

    it('рендира 3 категории', () => {
        const main = document.getElementById('main');
        const items = main.querySelectorAll('[data-category-id]');
        expect(items.length).toBe(3);
    });

    it('показва имената на категориите', () => {
        const main = document.getElementById('main');
        expect(main.textContent).toContain('Математика');
        expect(main.textContent).toContain('Физика');
        expect(main.textContent).toContain('Химия');
    });
});

// ---------------------------------------------------------------------------
// categoriesView — добавяне на категория
// ---------------------------------------------------------------------------

describe('categoriesView — добавяне', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        categoryService.getCategories.mockResolvedValue(MOCK_CATEGORIES);
        categoryService.createCategory.mockResolvedValue({ id: 'c4', name: 'Биология' });
        showCategories({});
        await vi.waitUntil(() => document.getElementById('main').querySelector('input'));
    });

    it('при добавяне извиква createCategory с правилното ime', async () => {
        const main = document.getElementById('main');
        const input = main.querySelector('input');
        const addBtn = Array.from(main.querySelectorAll('button'))
            .find(b => b.textContent.includes('Добави'));

        input.value = 'Биология';
        addBtn.click();

        await vi.waitUntil(() => categoryService.createCategory.mock.calls.length > 0);
        expect(categoryService.createCategory).toHaveBeenCalledWith('Биология');
    });

    it('след успешно добавяне показва новата категория', async () => {
        const main = document.getElementById('main');
        const input = main.querySelector('input');
        const addBtn = Array.from(main.querySelectorAll('button'))
            .find(b => b.textContent.includes('Добави'));

        input.value = 'Биология';
        addBtn.click();

        await vi.waitUntil(() => main.textContent.includes('Биология'));
        expect(main.textContent).toContain('Биология');
    });

    it('след успешно добавяне все още показва старите категории (immutable)', async () => {
        const main = document.getElementById('main');
        const input = main.querySelector('input');
        const addBtn = Array.from(main.querySelectorAll('button'))
            .find(b => b.textContent.includes('Добави'));

        input.value = 'Биология';
        addBtn.click();

        await vi.waitUntil(() => main.textContent.includes('Биология'));
        expect(main.textContent).toContain('Математика');
        expect(main.textContent).toContain('Физика');
    });

    it('показва грешка при празно поле', async () => {
        const main = document.getElementById('main');
        const input = main.querySelector('input');
        const addBtn = Array.from(main.querySelectorAll('button'))
            .find(b => b.textContent.includes('Добави'));

        // Нулираме броя на извикванията преди теста
        categoryService.createCategory.mockClear();

        input.value = '';
        addBtn.click();

        // createCategory не трябва да е извикан при празно поле
        expect(categoryService.createCategory).not.toHaveBeenCalled();

        // Показва error
        await vi.waitUntil(() => main.querySelector('.error'));
        expect(main.querySelector('.error')).not.toBeNull();
    });

    it('показва грешка при неуспешен API call', async () => {
        categoryService.createCategory.mockRejectedValue(new Error('API грешка'));

        const main = document.getElementById('main');
        const input = main.querySelector('input');
        const addBtn = Array.from(main.querySelectorAll('button'))
            .find(b => b.textContent.includes('Добави'));

        input.value = 'Биология';
        addBtn.click();

        await vi.waitUntil(() => main.querySelector('.error'));
        expect(main.querySelector('.error')).not.toBeNull();
    });

    it('след успешно добавяне показва toast с успешно съобщение', async () => {
        const main = document.getElementById('main');
        const input = main.querySelector('input');
        const addBtn = Array.from(main.querySelectorAll('button'))
            .find(b => b.textContent.includes('Добави'));

        input.value = 'Биология';
        addBtn.click();

        await vi.waitUntil(() => main.textContent.includes('Биология'));
        expect(showToast).toHaveBeenCalledWith('Категорията е добавена.', 'success');
    });
});

// ---------------------------------------------------------------------------
// categoriesView — изтриване на категория
// ---------------------------------------------------------------------------

describe('categoriesView — изтриване', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        // По подразбиране потребителят потвърждава изтриването
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        categoryService.getCategories.mockResolvedValue(MOCK_CATEGORIES);
        categoryService.deleteCategory.mockResolvedValue(null);
        showCategories({});
        await vi.waitUntil(() => document.getElementById('main').querySelector('[data-category-id]'));
    });

    it('при натискане на Изтрий извиква deleteCategory с правилния id', async () => {
        const main = document.getElementById('main');
        const items = main.querySelectorAll('[data-category-id]');
        const firstItem = items[0];
        const deleteBtn = Array.from(firstItem.querySelectorAll('button'))
            .find(b => b.textContent.includes('Изтрий') || b.dataset.action === 'delete');

        deleteBtn.click();

        await vi.waitUntil(() => categoryService.deleteCategory.mock.calls.length > 0);
        expect(categoryService.deleteCategory).toHaveBeenCalledWith('c1');
    });

    it('след успешно изтриване премахва категорията от списъка (immutable)', async () => {
        const main = document.getElementById('main');
        const items = main.querySelectorAll('[data-category-id]');
        const firstItem = items[0];
        const deleteBtn = Array.from(firstItem.querySelectorAll('button'))
            .find(b => b.textContent.includes('Изтрий') || b.dataset.action === 'delete');

        deleteBtn.click();

        await vi.waitUntil(() => {
            const remaining = main.querySelectorAll('[data-category-id]');
            return remaining.length === 2;
        });

        const remaining = main.querySelectorAll('[data-category-id]');
        expect(remaining.length).toBe(2);
    });

    it('след изтриване останалите категории са запазени', async () => {
        const main = document.getElementById('main');
        const items = main.querySelectorAll('[data-category-id]');
        const firstItem = items[0];
        const deleteBtn = Array.from(firstItem.querySelectorAll('button'))
            .find(b => b.textContent.includes('Изтрий') || b.dataset.action === 'delete');

        deleteBtn.click();

        await vi.waitUntil(() => main.querySelectorAll('[data-category-id]').length === 2);
        // Физика и Химия остават
        expect(main.textContent).toContain('Физика');
        expect(main.textContent).toContain('Химия');
    });

    it('показва грешка при неуспешно изтриване', async () => {
        categoryService.deleteCategory.mockRejectedValue(new Error('Грешка при изтриване'));

        const main = document.getElementById('main');
        const items = main.querySelectorAll('[data-category-id]');
        const firstItem = items[0];
        const deleteBtn = Array.from(firstItem.querySelectorAll('button'))
            .find(b => b.textContent.includes('Изтрий') || b.dataset.action === 'delete');

        deleteBtn.click();

        await vi.waitUntil(() => main.querySelector('.error'));
        expect(main.querySelector('.error')).not.toBeNull();
    });

    it('след успешно изтриване показва toast с успешно съобщение', async () => {
        const main = document.getElementById('main');
        const items = main.querySelectorAll('[data-category-id]');
        const firstItem = items[0];
        const deleteBtn = Array.from(firstItem.querySelectorAll('button'))
            .find(b => b.textContent.includes('Изтрий') || b.dataset.action === 'delete');

        deleteBtn.click();

        await vi.waitUntil(() => main.querySelectorAll('[data-category-id]').length === 2);
        expect(showToast).toHaveBeenCalledWith('Категорията е изтрита.', 'success');
    });

    it('показва confirm диалог преди изтриване', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

        const main = document.getElementById('main');
        const items = main.querySelectorAll('[data-category-id]');
        const firstItem = items[0];
        const deleteBtn = Array.from(firstItem.querySelectorAll('button'))
            .find(b => b.textContent.includes('Изтрий') || b.dataset.action === 'delete');

        deleteBtn.click();

        await vi.waitUntil(() => confirmSpy.mock.calls.length > 0);
        expect(confirmSpy).toHaveBeenCalled();
    });

    it('при отмяна на confirm не извиква deleteCategory', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        categoryService.deleteCategory.mockClear();

        const main = document.getElementById('main');
        const items = main.querySelectorAll('[data-category-id]');
        const firstItem = items[0];
        const deleteBtn = Array.from(firstItem.querySelectorAll('button'))
            .find(b => b.textContent.includes('Изтрий') || b.dataset.action === 'delete');

        deleteBtn.click();

        // deleteCategory не трябва да е извикан
        expect(categoryService.deleteCategory).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// categoriesView — error state (getCategories)
// ---------------------------------------------------------------------------

describe('categoriesView — error state', () => {
    it('показва съобщение при грешка при зареждане', async () => {
        categoryService.getCategories.mockRejectedValue(new Error('Мрежова грешка'));
        showCategories({});
        await vi.waitUntil(() => document.getElementById('main').querySelector('.error'));
        const errorEl = document.getElementById('main').querySelector('.error');
        expect(errorEl).not.toBeNull();
        expect(errorEl.textContent.length).toBeGreaterThan(0);
    });
});
