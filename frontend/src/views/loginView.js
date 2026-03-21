// Стъпка 8 — loginView.js
// Форма за вход на учителя.
// При успех → redirect към /dashboard.
// При грешка → показва съобщение под формата.
//
// Правило (Вариант Б): потребителски input се чете само с .value,
// никога не се вкарва директно в DOM.

import page from '../../lib/page.min.js';
import { login, isAuthenticated } from '../services/auth.js';

export function showLogin() {
    const main = document.getElementById('main');

    // Ако вече е влязъл — няма смисъл да вижда login формата
    if (isAuthenticated()) {
        page.redirect('/dashboard');
        return;
    }

    main.className = 'centered';
    main.replaceChildren(buildLoginCard());
}

// Изгражда картата с формата
function buildLoginCard() {
    const card = document.createElement('div');
    card.className = 'auth-card';

    card.appendChild(buildHeader());
    card.appendChild(buildForm());
    card.appendChild(buildFooter());

    return card;
}

// Заглавие и подзаглавие
function buildHeader() {
    const header = document.createElement('div');
    header.className = 'auth-header';

    const title = document.createElement('h1');
    title.textContent = 'Вход';

    const sub = document.createElement('p');
    sub.textContent = 'Влез в своя учителски акаунт.';

    header.appendChild(title);
    header.appendChild(sub);
    return header;
}

// Формата с полетата
function buildForm() {
    const form = document.createElement('form');
    form.id = 'login-form';
    form.noValidate = true;

    form.appendChild(buildField('email',    'Email',  'email',    'teacher@example.com'));
    form.appendChild(buildField('password', 'Парола', 'password', '••••••••'));

    // Съобщение за грешка — скрито по подразбиране
    const errorMsg = document.createElement('p');
    errorMsg.id = 'login-error';
    errorMsg.className = 'form-error';
    errorMsg.style.display = 'none';
    form.appendChild(errorMsg);

    // Submit бутон
    const btn = document.createElement('button');
    btn.type = 'submit';
    btn.className = 'btn btn-primary btn-full';
    btn.textContent = 'Влез';
    form.appendChild(btn);

    form.addEventListener('submit', (e) => handleSubmit(e, btn, errorMsg));
    return form;
}

// Помощна функция — изгражда едно поле label + input
function buildField(id, label, type, placeholder) {
    const group = document.createElement('div');
    group.className = 'form-group';

    const lbl = document.createElement('label');
    lbl.htmlFor = id;
    lbl.className = 'form-label';
    lbl.textContent = label;

    const input = document.createElement('input');
    input.type = type;
    input.id = id;
    input.className = 'form-input';
    input.placeholder = placeholder;
    input.required = true;

    group.appendChild(lbl);
    group.appendChild(input);
    return group;
}

// Обработва изпращането на формата
async function handleSubmit(e, btn, errorMsg) {
    e.preventDefault();

    // Четем стойностите с .value — никога не ги слагаме обратно в innerHTML
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Визуална обратна връзка — деактивираме бутона
    btn.disabled = true;
    btn.textContent = 'Зареждане...';
    errorMsg.style.display = 'none';

    try {
        await login(email, password);
        page.redirect('/dashboard');
    } catch (err) {
        // Показваме грешката с textContent — без XSS риск
        errorMsg.textContent = err.message;
        errorMsg.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Влез';
    }
}

// Линк към регистрация
function buildFooter() {
    const footer = document.createElement('div');
    footer.className = 'auth-footer';

    const text = document.createElement('span');
    text.textContent = 'Нямаш акаунт? ';

    const link = document.createElement('a');
    link.href = '/register';
    link.textContent = 'Регистрирай се';

    footer.appendChild(text);
    footer.appendChild(link);
    return footer;
}
