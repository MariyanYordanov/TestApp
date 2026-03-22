// Тестове за services/categoryService.js

vi.mock('../../services/api.js', () => ({
    api: {
        get:    vi.fn(),
        post:   vi.fn(),
        put:    vi.fn(),
        delete: vi.fn(),
    },
}));

const { api } = await import('../../services/api.js');
const {
    getCategories,
    createCategory,
    deleteCategory,
} = await import('../../services/categoryService.js');

beforeEach(() => {
    vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getCategories
// ---------------------------------------------------------------------------
describe('categoryService — getCategories()', () => {
    it('извиква api.get с /categories', async () => {
        api.get.mockResolvedValueOnce([]);

        await getCategories();

        expect(api.get).toHaveBeenCalledWith('/categories');
    });

    it('връща масив от категории при успех', async () => {
        const mockCategories = [
            { id: 'cat-1', name: 'Математика' },
            { id: 'cat-2', name: 'История' },
            { id: 'cat-3', name: 'Физика' },
        ];
        api.get.mockResolvedValueOnce(mockCategories);

        const result = await getCategories();

        expect(result).toEqual(mockCategories);
    });

    it('връща празен масив когато няма категории', async () => {
        api.get.mockResolvedValueOnce([]);

        const result = await getCategories();

        expect(result).toEqual([]);
    });

    it('хвърля грешка при API грешка', async () => {
        api.get.mockRejectedValueOnce(new Error('Грешка при зареждане на категориите'));

        await expect(getCategories()).rejects.toThrow('Грешка при зареждане на категориите');
    });
});

// ---------------------------------------------------------------------------
// createCategory
// ---------------------------------------------------------------------------
describe('categoryService — createCategory()', () => {
    it('извиква api.post с /categories и { name }', async () => {
        const name = 'JavaScript';
        api.post.mockResolvedValueOnce({ id: 'cat-new', name });

        await createCategory(name);

        expect(api.post).toHaveBeenCalledWith('/categories', { name: 'JavaScript' });
    });

    it('връща новосъздадената категория', async () => {
        const created = { id: 'cat-new', name: 'JS' };
        api.post.mockResolvedValueOnce(created);

        const result = await createCategory('JS');

        expect(result).toEqual(created);
    });

    it('хвърля грешка при API грешка', async () => {
        api.post.mockRejectedValueOnce(new Error('Категорията вече съществува'));

        await expect(createCategory('Математика')).rejects.toThrow('Категорията вече съществува');
    });

    it('хвърля грешка при празно име', async () => {
        await expect(createCategory('')).rejects.toThrow('Името на категорията е задължително.');
    });

    it('хвърля грешка при undefined', async () => {
        await expect(createCategory(undefined)).rejects.toThrow('Името на категорията е задължително.');
    });

    it('хвърля грешка при null', async () => {
        await expect(createCategory(null)).rejects.toThrow('Името на категорията е задължително.');
    });
});

// ---------------------------------------------------------------------------
// deleteCategory
// ---------------------------------------------------------------------------
describe('categoryService — deleteCategory()', () => {
    it('извиква api.delete с /categories/{id}', async () => {
        const id = 'some-category-id';
        api.delete.mockResolvedValueOnce(null);

        await deleteCategory(id);

        expect(api.delete).toHaveBeenCalledWith(`/categories/${id}`);
    });

    it('връща null при успешно изтриване', async () => {
        api.delete.mockResolvedValueOnce(null);

        const result = await deleteCategory('some-category-id');

        expect(result).toBeNull();
    });

    it('хвърля грешка при API грешка', async () => {
        api.delete.mockRejectedValueOnce(new Error('Категорията се използва от тестове'));

        await expect(deleteCategory('cat-1')).rejects.toThrow('Категорията се използва от тестове');
    });
});
