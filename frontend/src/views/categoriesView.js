// Стъпка 52 — categoriesView.js
// Управление на категории — преглед, добавяне, изтриване.
//
// Функционалност:
//   - Зарежда всички категории при влизане в страницата
//   - Показва форма за добавяне на нова категория (валидация: непразно поле)
//   - Показва списък с категории, всяка с бутон за изтриване
//   - Имутабилни операции — никога не мутира масива с категории

import * as categoryService from '../services/categoryService.js';
import { buildCategoryList, buildAddCategoryForm } from '../templates/categoryListTemplate.js';
import { showToast } from '../utils/notification.js';

export async function showCategories(_ctx) {
    const main = document.getElementById('main');

    // Показваме loading state
    const loadingEl = document.createElement('div');
    loadingEl.className = 'loading';
    loadingEl.textContent = 'Зареждане...';
    main.replaceChildren(loadingEl);

    let categories;
    try {
        categories = await categoryService.getCategories() ?? [];
    } catch (err) {
        const errorEl = document.createElement('div');
        errorEl.className = 'error';
        errorEl.textContent = `Грешка при зареждане на категориите: ${err.message}`;
        main.replaceChildren(errorEl);
        return;
    }

    renderPage(main, categories);
}

// Рендира цялата страница с форма и списък
function renderPage(main, categories) {
    const wrapper = document.createElement('div');
    wrapper.className = 'categories-page';

    const h1 = document.createElement('h1');
    h1.textContent = 'Управление на категории';
    wrapper.appendChild(h1);

    // Зона за грешки
    const errorArea = document.createElement('div');
    errorArea.id = 'categories-error';
    wrapper.appendChild(errorArea);

    // Форма за добавяне — при onAdd валидираме и извикваме API
    const form = buildAddCategoryForm((name) => handleAdd(name, categories, main, errorArea));
    wrapper.appendChild(form);

    // Списък с категории
    const listContainer = document.createElement('div');
    listContainer.id = 'categories-list';
    listContainer.appendChild(buildCategoryList(
        categories,
        (id) => handleDelete(id, categories, main, listContainer, errorArea),
    ));
    wrapper.appendChild(listContainer);

    main.replaceChildren(wrapper);
}

// Обработва добавяне на нова категория
// Валидира, извиква API, обновява списъка имутабилно
async function handleAdd(name, currentCategories, main, errorArea) {
    clearError(errorArea);

    if (!name || !name.trim()) {
        showError(errorArea, 'Името на категорията не може да е празно.');
        return;
    }

    try {
        const newCategory = await categoryService.createCategory(name.trim());
        // Имутабилно — създаваме нов масив с добавения елемент
        const updated = [...currentCategories, newCategory];
        // Известяваме потребителя за успешното добавяне
        showToast('Категорията е добавена.', 'success');
        renderPage(main, updated);
    } catch (err) {
        showError(errorArea, `Грешка при добавяне: ${err.message}`);
    }
}

// Обработва изтриване на категория по id
// Показва confirm диалог, извиква API, обновява списъка имутабилно (filter → нов масив)
async function handleDelete(id, currentCategories, main, _listContainer, errorArea) {
    // Искаме потвърждение от потребителя преди изтриване
    if (!window.confirm('Наистина ли искате да изтриете тази категория?')) {
        return;
    }

    clearError(errorArea);

    try {
        await categoryService.deleteCategory(id);
        // Имутабилно — filter връща нов масив без изтрития елемент
        const updated = currentCategories.filter(cat => cat.id !== id);
        // Известяваме потребителя за успешното изтриване
        showToast('Категорията е изтрита.', 'success');
        renderPage(main, updated);
    } catch (err) {
        showError(errorArea, `Грешка при изтриване: ${err.message}`);
    }
}

// Показва съобщение за грешка в зоната за грешки
function showError(errorArea, message) {
    const el = document.createElement('div');
    el.className = 'error';
    el.textContent = message;
    errorArea.replaceChildren(el);
}

// Изчиства зоната за грешки
function clearError(errorArea) {
    errorArea.replaceChildren();
}
