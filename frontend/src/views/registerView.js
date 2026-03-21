// Стъпка 8 — registerView.js
// Форма за регистрация на нов учител.
// При успех → redirect към /dashboard.
// Структурата е идентична с loginView.js — добра възможност
// да покажем на учениците повторното използване на паттърни.

import page from '../../lib/page.min.js';
import { register, isAuthenticated } from '../services/auth.js';

export function showRegister() {
    const main = document.getElementById('main');

    if (isAuthenticated()) {
        page.redirect('/dashboard');
        return;
    }

    main.className = 'centered';
    main.replaceChildren(buildRegisterCard());
}

function buildRegisterCard() {
    const card = document.createElement('div');
    card.className = 'auth-card';

    card.appendChild(buildHeader());
    card.appendChild(buildForm());
    card.appendChild(buildFooter());

    return card;
}

function buildHeader() {
    const header = document.createElement('div');
    header.className = 'auth-header';

    const title = document.createElement('h1');
    title.textContent = 'Регистрация';

    const sub = document.createElement('p');
    sub.textContent = 'Създай учителски акаунт безплатно.';

    header.appendChild(title);
    header.appendChild(sub);
    return header;
}

function buildForm() {
    const form = document.createElement('form');
    form.id = 'register-form';
    form.noValidate = true;

    form.appendChild(buildField('fullName', 'Пълно име',  'text',     'Иван Петров'));
    form.appendChild(buildField('email',    'Email',      'email',    'teacher@example.com'));
    form.appendChild(buildField('password', 'Парола',     'password', 'мин. 8 символа'));
    form.appendChild(buildField('confirm',  'Потвърди паролата', 'password', '••••••••'));

    const errorMsg = document.createElement('p');
    errorMsg.id = 'register-error';
    errorMsg.className = 'form-error';
    errorMsg.style.display = 'none';
    form.appendChild(errorMsg);

    const btn = document.createElement('button');
    btn.type = 'submit';
    btn.className = 'btn btn-primary btn-full';
    btn.textContent = 'Създай акаунт';
    form.appendChild(btn);

    form.addEventListener('submit', (e) => handleSubmit(e, btn, errorMsg));
    return form;
}

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

async function handleSubmit(e, btn, errorMsg) {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirm  = document.getElementById('confirm').value;

    // Валидация преди изпращане към API
    if (password !== confirm) {
        errorMsg.textContent = 'Паролите не съвпадат.';
        errorMsg.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Зареждане...';
    errorMsg.style.display = 'none';

    try {
        await register(email, password, fullName);
        page.redirect('/dashboard');
    } catch (err) {
        errorMsg.textContent = err.message;
        errorMsg.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Създай акаунт';
    }
}

function buildFooter() {
    const footer = document.createElement('div');
    footer.className = 'auth-footer';

    const text = document.createElement('span');
    text.textContent = 'Вече имаш акаунт? ';

    const link = document.createElement('a');
    link.href = '/login';
    link.textContent = 'Влез';

    footer.appendChild(text);
    footer.appendChild(link);
    return footer;
}
