// Стъпка 7 — auth.js
// Управлява автентикацията на учителя.
// Съхранява JWT токена и потребителските данни в localStorage.
//
// Публични функции:
//   getToken()        — връща JWT токена или null
//   getUser()         — връща { id, email, fullName } или null
//   isAuthenticated() — true ако токенът съществува и не е изтекъл
//   login(email, password)            — вход
//   register(email, password, name)   — регистрация
//   logout()          — изчиства сесията

import { api } from './api.js';

const TOKEN_KEY = 'token';
const USER_KEY  = 'user';

// Връща JWT токена от localStorage
export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

// Връща обекта с данни за потребителя
export function getUser() {
    const data = localStorage.getItem(USER_KEY);
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch {
        return null;
    }
}

// Проверява дали токенът съществува И не е изтекъл
// JWT се декодира base64 — не е нужна библиотека
export function isAuthenticated() {
    const token = getToken();
    if (!token) return false;

    try {
        // JWT структура: header.payload.signature
        // Декодираме само payload-а (средната част)
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 > Date.now();
    } catch {
        return false;
    }
}

// Вход с email и парола
// При успех — запазва токена и потребителя в localStorage
export async function login(email, password) {
    if (!email || !password) {
        throw new Error('Моля въведи email и парола.');
    }

    const result = await api.post('/auth/login', { email, password });

    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));

    return result;
}

// Регистрация с email, парола и пълно име
export async function register(email, password, fullName) {
    if (!email || !password || !fullName) {
        throw new Error('Всички полета са задължителни.');
    }
    if (password.length < 8) {
        throw new Error('Паролата трябва да е поне 8 символа.');
    }

    const result = await api.post('/auth/register', { email, password, fullName });

    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));

    return result;
}

// Изход — изчиства localStorage
export function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}
