// Стъпка 40 — categoryService.js
// Сервизен слой за операции с категории.
// Обвива api.js и предоставя именувани функции с ясна бизнес семантика.
//
// Публични функции:
//   getCategories()      — зарежда всички достъпни категории
//   createCategory(name) — създава нова категория по зададено име
//   deleteCategory(id)   — изтрива категория по ID

import { api } from './api.js';

// Връща всички категории (собствени + публични)
export async function getCategories() {
    return api.get('/categories');
}

// Създава нова категория — изисква непразно name
export async function createCategory(name) {
    if (!name) {
        throw new Error('Името на категорията е задължително.');
    }

    return api.post('/categories', { name });
}

// Изтрива категория по ID — връща null при успех
export async function deleteCategory(id) {
    return api.delete(`/categories/${id}`);
}
