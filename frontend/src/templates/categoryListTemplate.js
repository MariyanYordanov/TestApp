// Стъпка 51 — categoryListTemplate.js
// Шаблон за списък с категории

// Изгражда елемент за една категория с бутон за изтриване
// category: { id, name }
// onDelete: функция, извиквана с id при натискане на бутона
export function buildCategoryItem(category, onDelete) {
    const item = document.createElement('div');
    item.className = 'category-item';
    item.dataset.categoryId = category.id;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'category-name';
    // Потребителски данни — само textContent, без innerHTML
    nameSpan.textContent = category.name;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger btn-sm';
    deleteBtn.textContent = 'Изтрий';
    deleteBtn.dataset.action = 'delete';
    deleteBtn.addEventListener('click', () => onDelete(category.id));

    item.appendChild(nameSpan);
    item.appendChild(deleteBtn);

    return item;
}

// Изгражда целия списък с категории
// categories: масив от категории — не се мутира
// onDelete: функция, извиквана с id при изтриване
export function buildCategoryList(categories, onDelete) {
    const list = document.createElement('div');
    list.className = 'category-list';

    // forEach не мутира — само чете
    categories.forEach(cat => list.appendChild(buildCategoryItem(cat, onDelete)));

    return list;
}

// Изгражда форма за добавяне на категория
// onAdd: функция, извиквана с name при потвърждение
export function buildAddCategoryForm(onAdd) {
    const form = document.createElement('form');
    form.className = 'add-category-form';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Въведете име на категория';
    input.maxLength = 100;
    input.className = 'input-category-name';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = 'Добави';

    // Извикваме onAdd при клик на бутона
    addBtn.addEventListener('click', () => onAdd(input.value));

    // Извикваме onAdd и при submit (Enter в полето)
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        onAdd(input.value);
    });

    form.appendChild(input);
    form.appendChild(addBtn);

    return form;
}
