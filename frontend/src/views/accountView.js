// Стъпка 61 — accountView.js
// Изглед за потребителски акаунт (само четене).
// Показва името и email-а на влезлия учител.
// Предоставя бутон за изход от системата.

import { getUser, logout } from '../services/auth.js';
import page from '../../lib/page.min.js';

export function showAccount(_ctx) {
    const main = document.getElementById('main');
    const user = getUser();

    // Ако няма влязъл потребител — пренасочваме към /login
    if (!user) {
        page.redirect('/login');
        return;
    }

    // Изгражда DOM за акаунт страницата
    const container = document.createElement('div');
    container.className = 'page-container';

    const header = document.createElement('div');
    header.className = 'page-header';
    const title = document.createElement('h1');
    title.textContent = 'Акаунт';
    header.appendChild(title);

    const card = document.createElement('div');
    card.className = 'auth-card';

    // Показва данните на потребителя (XSS-safe: textContent)
    const nameLabel = document.createElement('p');
    nameLabel.textContent = `Име: ${user.fullName || user.name || ''}`;

    const emailLabel = document.createElement('p');
    emailLabel.textContent = `Email: ${user.email || ''}`;

    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-secondary';
    logoutBtn.textContent = 'Изход';
    logoutBtn.addEventListener('click', () => {
        logout();
        page.redirect('/');
    });

    card.appendChild(nameLabel);
    card.appendChild(emailLabel);
    card.appendChild(logoutBtn);
    container.appendChild(header);
    container.appendChild(card);

    main.innerHTML = '';
    main.appendChild(container);
}
