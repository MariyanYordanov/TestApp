// Стъпка 6 — api.js
// Универсален fetch wrapper за всички HTTP заявки към backend-а.
// Автоматично добавя JWT токена към всяка заявка.
// При грешки хвърля Error с четимо съобщение.
//
// Употреба:
//   import { api } from './api.js';
//   const tests = await api.get('/tests');
//   const test  = await api.post('/tests', { title: 'Нов тест' });

import { API_BASE_URL } from '../config.js';
import { getToken }     from './auth.js';
import page             from '../../lib/page.min.js';

// Основна функция — изпраща HTTP заявка и обработва отговора
// Опцията skipAuth: true пропуска добавянето на JWT (за публични ендпойнти)
async function request(url, options = {}) {
    const { skipAuth = false, ...fetchOptions } = options;
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
    };

    // Добавяме JWT токена само ако съществува И не е публична заявка
    if (token && !skipAuth) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let response;
    try {
        response = await fetch(API_BASE_URL + url, { ...fetchOptions, headers });
    } catch {
        // Мрежова грешка — сървърът не отговаря
        throw new Error('Няма връзка със сървъра. Провери дали backend-ът работи.');
    }

    // 401 — токенът е изтекъл или невалиден → изчистваме сесията
    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        page.redirect('/login');
        throw new Error('Сесията е изтекла. Моля влез отново.');
    }

    // 404 — ресурсът не е намерен → връщаме null (caller решава как да го обработи)
    if (response.status === 404) return null;

    // 204 No Content — успешна заявка без тяло (напр. DELETE)
    if (response.status === 204) return null;

    // Всички останали грешки (400, 403, 500...)
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Грешка ${response.status}`);
    }

    return response.json();
}

// Публичен API обект — четири HTTP метода
// Всеки метод приема незадължителен трети аргумент opts (напр. { skipAuth: true })
export const api = {
    get:    (url, opts = {})       => request(url, { method: 'GET',    ...opts }),
    post:   (url, data, opts = {}) => request(url, { method: 'POST',   body: JSON.stringify(data), ...opts }),
    put:    (url, data, opts = {}) => request(url, { method: 'PUT',    body: JSON.stringify(data), ...opts }),
    delete: (url, opts = {})       => request(url, { method: 'DELETE', ...opts }),
};
