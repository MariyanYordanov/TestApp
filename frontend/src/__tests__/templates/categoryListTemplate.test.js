// Тестове за templates/categoryListTemplate.js
// Стъпка 51 — categoryListTemplate.test.js

import {
    buildCategoryItem,
    buildCategoryList,
    buildAddCategoryForm,
} from '../../templates/categoryListTemplate.js';

// ---------------------------------------------------------------------------
// Помощни данни
// ---------------------------------------------------------------------------

const makeCategory = (overrides = {}) => ({
    id: 'c1',
    name: 'Математика',
    ...overrides,
});

// ---------------------------------------------------------------------------
// buildCategoryItem()
// ---------------------------------------------------------------------------

describe('buildCategoryItem() — структура', () => {
    it('създава DOM елемент', () => {
        const item = buildCategoryItem(makeCategory(), vi.fn());
        expect(item instanceof HTMLElement).toBe(true);
    });

    it('показва name с textContent (без XSS)', () => {
        const maliciousName = '<script>alert("xss")</script>';
        const item = buildCategoryItem(makeCategory({ name: maliciousName }), vi.fn());
        expect(item.textContent).toContain(maliciousName);
        expect(item.innerHTML).not.toContain('<script>');
    });

    it('съдържа бутон "Изтрий"', () => {
        const item = buildCategoryItem(makeCategory(), vi.fn());
        const buttons = item.querySelectorAll('button');
        const deleteBtn = Array.from(buttons).find(b =>
            b.textContent.includes('Изтрий') || b.dataset.action === 'delete'
        );
        expect(deleteBtn).toBeDefined();
    });

    it('извиква onDelete с id при клик на бутона', () => {
        const onDelete = vi.fn();
        const cat = makeCategory({ id: 'cat-123' });
        const item = buildCategoryItem(cat, onDelete);
        const buttons = item.querySelectorAll('button');
        const deleteBtn = Array.from(buttons).find(b =>
            b.textContent.includes('Изтрий') || b.dataset.action === 'delete'
        );
        deleteBtn.click();
        expect(onDelete).toHaveBeenCalledWith('cat-123');
    });

    it('извиква onDelete точно веднъж при клик', () => {
        const onDelete = vi.fn();
        const item = buildCategoryItem(makeCategory(), onDelete);
        const buttons = item.querySelectorAll('button');
        const deleteBtn = Array.from(buttons).find(b =>
            b.textContent.includes('Изтрий') || b.dataset.action === 'delete'
        );
        deleteBtn.click();
        expect(onDelete).toHaveBeenCalledTimes(1);
    });
});

// ---------------------------------------------------------------------------
// buildCategoryList()
// ---------------------------------------------------------------------------

describe('buildCategoryList() — структура', () => {
    it('създава DOM елемент', () => {
        const list = buildCategoryList([], vi.fn());
        expect(list instanceof HTMLElement).toBe(true);
    });

    it('рендира 0 елемента при празен масив', () => {
        const list = buildCategoryList([], vi.fn());
        // Не трябва да има category items
        const items = list.querySelectorAll('[data-category-id]');
        expect(items.length).toBe(0);
    });

    it('рендира 1 елемент при 1 категория', () => {
        const list = buildCategoryList([makeCategory()], vi.fn());
        const items = list.querySelectorAll('[data-category-id]');
        expect(items.length).toBe(1);
    });

    it('рендира 3 елемента при 3 категории', () => {
        const categories = [
            makeCategory({ id: 'c1', name: 'Математика' }),
            makeCategory({ id: 'c2', name: 'Физика' }),
            makeCategory({ id: 'c3', name: 'Химия' }),
        ];
        const list = buildCategoryList(categories, vi.fn());
        const items = list.querySelectorAll('[data-category-id]');
        expect(items.length).toBe(3);
    });

    it('не мутира оригиналния масив', () => {
        const categories = [makeCategory()];
        const original = [...categories];
        buildCategoryList(categories, vi.fn());
        expect(categories).toEqual(original);
    });

    it('предава onDelete към всеки елемент', () => {
        const onDelete = vi.fn();
        const categories = [makeCategory({ id: 'c1' }), makeCategory({ id: 'c2' })];
        const list = buildCategoryList(categories, onDelete);
        const items = list.querySelectorAll('[data-category-id]');

        // Кликаме delete на първия елемент
        const firstDeleteBtn = Array.from(items[0].querySelectorAll('button'))
            .find(b => b.textContent.includes('Изтрий') || b.dataset.action === 'delete');
        firstDeleteBtn.click();
        expect(onDelete).toHaveBeenCalledWith('c1');
    });
});

// ---------------------------------------------------------------------------
// buildAddCategoryForm()
// ---------------------------------------------------------------------------

describe('buildAddCategoryForm() — структура', () => {
    it('създава DOM елемент', () => {
        const form = buildAddCategoryForm(vi.fn());
        expect(form instanceof HTMLElement).toBe(true);
    });

    it('съдържа <input> за въвеждане на името', () => {
        const form = buildAddCategoryForm(vi.fn());
        const input = form.querySelector('input');
        expect(input).not.toBeNull();
    });

    it('съдържа бутон "Добави"', () => {
        const form = buildAddCategoryForm(vi.fn());
        const buttons = form.querySelectorAll('button');
        const addBtn = Array.from(buttons).find(b => b.textContent.includes('Добави'));
        expect(addBtn).toBeDefined();
    });

    it('извиква onAdd с въведеното ime при клик', () => {
        const onAdd = vi.fn();
        const form = buildAddCategoryForm(onAdd);
        const input = form.querySelector('input');
        const addBtn = Array.from(form.querySelectorAll('button'))
            .find(b => b.textContent.includes('Добави'));

        input.value = 'Нова категория';
        addBtn.click();

        expect(onAdd).toHaveBeenCalledWith('Нова категория');
    });

    it('извиква onAdd при submit на формата', () => {
        const onAdd = vi.fn();
        const form = buildAddCategoryForm(onAdd);
        const input = form.querySelector('input');

        input.value = 'Тествана категория';

        // submit event
        const submitEl = form.tagName === 'FORM' ? form : form.querySelector('form');
        if (submitEl) {
            submitEl.dispatchEvent(new Event('submit'));
        } else {
            // Ако няма form елемент — просто кликаме бутона
            const addBtn = Array.from(form.querySelectorAll('button'))
                .find(b => b.textContent.includes('Добави'));
            addBtn.click();
        }

        expect(onAdd).toHaveBeenCalled();
    });

    it('input има maxlength=100', () => {
        const form = buildAddCategoryForm(vi.fn());
        const input = form.querySelector('input');
        expect(Number(input.getAttribute('maxlength'))).toBe(100);
    });
});
