// Стъпка 7 — homeView.js
// Landing page — публична страница, видима без login.
// Показва описание на платформата и два бутона:
//   - "Вход за учители" → /login
//   - "Влез в тест" → /test/:shareCode (за ученици с код)
//
// Всички текстове са статични → използваме createElement + textContent.

import page from '../../lib/page.min.js';
import { isAuthenticated } from '../services/auth.js';

export function showHome() {
    const main = document.getElementById('main');

    // Ако учителят вече е влязъл — пренасочваме към dashboard
    if (isAuthenticated()) {
        page.redirect('/dashboard');
        return;
    }

    // Центрираме съдържанието на началната страница
    main.className = 'centered';
    main.replaceChildren(buildHero());
}

// --- Изгражда hero секцията ---
function buildHero() {
    const hero = document.createElement('div');
    hero.className = 'hero';

    hero.appendChild(buildBadge());
    hero.appendChild(buildTitle());
    hero.appendChild(buildSubtitle());
    hero.appendChild(buildActions());
    hero.appendChild(buildFeatures());

    return hero;
}

// Малък badge над заглавието
function buildBadge() {
    const badge = document.createElement('span');
    badge.className = 'hero-badge';
    badge.textContent = 'Платформа за тестове';
    return badge;
}

// Главно заглавие
function buildTitle() {
    const h1 = document.createElement('h1');
    h1.className = 'hero-title';
    h1.textContent = 'TestApp';
    return h1;
}

// Описателен текст
function buildSubtitle() {
    const p = document.createElement('p');
    p.className = 'hero-subtitle';
    p.textContent = 'Учителите създават тестове. Учениците ги решават — без регистрация, само с линк.';
    return p;
}

// Два бутона за действие
function buildActions() {
    const actions = document.createElement('div');
    actions.className = 'hero-actions';

    // Бутон за учители
    const loginBtn = document.createElement('a');
    loginBtn.href = '/login';
    loginBtn.className = 'btn btn-primary btn-lg';
    loginBtn.textContent = 'Вход за учители';

    // Бутон за ученици — отваря диалог за въвеждане на код
    const codeBtn = document.createElement('button');
    codeBtn.className = 'btn btn-secondary btn-lg';
    codeBtn.textContent = 'Влез в тест с код';
    codeBtn.addEventListener('click', showCodePrompt);

    actions.appendChild(loginBtn);
    actions.appendChild(codeBtn);
    return actions;
}

// Три feature карти с описание на платформата
function buildFeatures() {
    const features = [
        { title: 'Лесно създаване', text: 'Wizard с 3 стъпки — заглавие, категории, въпроси.' },
        { title: 'Споделяне с линк', text: 'Учениците получават 8-символен код. Без регистрация.' },
        { title: 'Резултати веднага', text: 'Учителят вижда резултатите в реално време.' },
    ];

    const grid = document.createElement('div');
    grid.className = 'hero-features';

    features.forEach(f => {
        const card = document.createElement('div');
        card.className = 'feature-card';

        const title = document.createElement('h3');
        title.textContent = f.title;

        const text = document.createElement('p');
        text.textContent = f.text;

        card.appendChild(title);
        card.appendChild(text);
        grid.appendChild(card);
    });

    return grid;
}

// Показва prompt за въвеждане на shareCode от ученик
function showCodePrompt() {
    // Използваме нативния browser prompt — прост и без зависимости
    // В бъдеще може да се замени с custom modal
    const code = window.prompt('Въведи кода на теста (8 символа):');
    if (!code) return;

    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 8) {
        window.alert('Кодът трябва да е точно 8 символа.');
        return;
    }

    page.redirect(`/test/${trimmed}`);
}
