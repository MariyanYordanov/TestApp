// Стъпка 6 — nav.js
// Управлява sidebar навигацията на учителя.
// Показва/скрива sidebar според автентикацията.
// Маркира активния route.
//
// Правило (Вариант Б):
//   - Структурата на nav-а се изгражда с createElement (статичен HTML)
//   - Потребителски данни (fullName) се вкарват само чрез textContent

import page from '../../lib/page.min.js';
import { isAuthenticated, logout, getUser } from '../services/auth.js';

// Дефиниция на навигационните елементи
const NAV_ITEMS = [
    { path: '/dashboard',  label: 'Моите тестове' },
    { path: '/categories', label: 'Категории' },
    { path: '/classes',    label: 'Класове' },
    { path: '/statistics', label: 'Статистика' },
    { path: '/account',    label: 'Акаунт' },
];

// Регистрира middleware в page.js — при всяка смяна на route обновява nav-а
// Стъпка 56: затваря мобилния sidebar при навигация
export function setupNav() {
    page('*', (ctx, next) => {
        document.body.classList.remove('sidebar-open');
        updateNav(ctx.path);
        next();
    });
    setupMobileNav();
}

// Стъпка 56 — Мобилен hamburger toggle.
// Създава бутон само ако потребителят е автентикиран (sidebar е видим).
// Предпазва от дублиране — премахва стар бутон преди да добави нов.
export function setupMobileNav() {
    // Само при автентикиран потребител sidebar е видим
    if (!isAuthenticated()) return;

    // Предпазваме от дублиране при повторно извикване
    const existing = document.querySelector('.mobile-nav-toggle');
    if (existing) return;

    const btn = document.createElement('button');
    btn.className = 'mobile-nav-toggle';
    btn.setAttribute('aria-label', 'Отвори навигацията');
    btn.textContent = '☰';

    // Превключва sidebar-open при клик
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.body.classList.toggle('sidebar-open');
    });

    document.body.appendChild(btn);

    // Затваря sidebar при клик извън него
    document.body.addEventListener('click', (e) => {
        if (!document.body.classList.contains('sidebar-open')) return;
        const sidebar = document.getElementById('sidebar');
        const toggle = document.querySelector('.mobile-nav-toggle');
        if (sidebar && sidebar.contains(e.target)) return;
        if (toggle && toggle.contains(e.target)) return;
        document.body.classList.remove('sidebar-open');
    });
}

// Изгражда или скрива sidebar според текущото auth-състояние
export function updateNav(currentPath = '/') {
    const sidebar = document.getElementById('sidebar');

    if (!isAuthenticated()) {
        sidebar.style.display = 'none';
        sidebar.replaceChildren(); // изчиства старото съдържание
        return;
    }

    sidebar.style.display = 'flex';
    sidebar.replaceChildren(
        buildHeader(),
        buildNavList(currentPath),
        buildFooter()
    );
}

// --- Помощни функции за изграждане на DOM елементите ---

// Хедър с лого и име на потребителя
export function buildHeader() {
    const header = document.createElement('div');
    header.className = 'nav-header';

    const logo = document.createElement('h2');
    logo.textContent = 'TestApp'; // статичен текст

    // Потребителско име идва от JWT payload — вкарваме само с textContent
    const user = getUser();
    const userName = document.createElement('p');
    userName.className = 'nav-user';
    userName.textContent = user?.fullName ?? '';

    header.appendChild(logo);
    header.appendChild(userName);
    return header;
}

// Списък с навигационни бутони
export function buildNavList(currentPath) {
    const ul = document.createElement('ul');
    ul.className = 'nav-list';

    NAV_ITEMS.forEach(item => {
        const li = document.createElement('li');
        li.className = `nav-item${currentPath === item.path ? ' active' : ''}`;

        const a = document.createElement('a');
        a.href = item.path;

        const label = document.createElement('span');
        label.textContent = item.label; // статично — не идва от потребител

        a.appendChild(label);
        li.appendChild(a);
        ul.appendChild(li);
    });

    return ul;
}

// Footer с бутон за изход
export function buildFooter() {
    const footer = document.createElement('div');
    footer.className = 'nav-footer';

    const btn = document.createElement('button');
    btn.className = 'btn-logout';
    btn.textContent = 'Изход';
    btn.addEventListener('click', () => {
        logout();
        page.redirect('/');
    });

    footer.appendChild(btn);
    return footer;
}
