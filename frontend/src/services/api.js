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
async function request(url, options = {}) {
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Добавяме JWT токена само ако съществува
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let response;
    try {
        response = await fetch(API_BASE_URL + url, { ...options, headers });
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
export const api = {
    get:    (url)         => request(url, { method: 'GET' }),
    post:   (url, data)   => request(url, { method: 'POST',   body: JSON.stringify(data) }),
    put:    (url, data)   => request(url, { method: 'PUT',    body: JSON.stringify(data) }),
    delete: (url)         => request(url, { method: 'DELETE' }),
};
