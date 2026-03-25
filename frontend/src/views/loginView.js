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
    form.autocomplete = 'off';

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
    input.autocomplete = type === 'password' ? 'new-password' : 'off';

    group.appendChild(lbl);

    if (type === 'password') {
        // Обвиваме input + бутон за показване в wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'input-password-wrapper';

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'btn-password-toggle';
        toggleBtn.setAttribute('aria-label', 'Покажи/скрий паролата');
        toggleBtn.innerHTML = eyeIcon(false);
        toggleBtn.addEventListener('click', () => {
            const visible = input.type === 'text';
            input.type = visible ? 'password' : 'text';
            toggleBtn.innerHTML = eyeIcon(visible);
        });

        wrapper.appendChild(input);
        wrapper.appendChild(toggleBtn);
        group.appendChild(wrapper);
    } else {
        group.appendChild(input);
    }

    return group;
}

// SVG иконки за показване/скриване на парола
function eyeIcon(isVisible) {
    if (isVisible) {
        // Затворено око (паролата е видима — клик ще я скрие)
        return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>`;
    }
    // Отворено око (паролата е скрита — клик ще я покаже)
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
    </svg>`;
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
