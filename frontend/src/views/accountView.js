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

    const fullName = user.fullName || user.name || '';
    const initials = fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const container = document.createElement('div');
    container.className = 'account-page';

    const h1 = document.createElement('h1');
    h1.style.cssText = 'font-size:var(--font-size-2xl);font-weight:700;margin-bottom:1.5rem';
    h1.textContent = 'Акаунт';
    container.appendChild(h1);

    const card = document.createElement('div');
    card.className = 'profile-card';

    const avatar = document.createElement('div');
    avatar.className = 'profile-avatar';
    avatar.textContent = initials || '?';

    const nameEl = document.createElement('p');
    nameEl.className = 'profile-name';
    nameEl.textContent = fullName;

    const emailEl = document.createElement('p');
    emailEl.className = 'profile-email';
    emailEl.textContent = user.email || '';

    const divider = document.createElement('hr');
    divider.className = 'profile-divider';

    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-danger';
    logoutBtn.style.width = '100%';
    logoutBtn.textContent = 'Изход от акаунта';
    logoutBtn.addEventListener('click', () => { logout(); page.redirect('/'); });

    card.appendChild(avatar);
    card.appendChild(nameEl);
    card.appendChild(emailEl);
    card.appendChild(divider);
    card.appendChild(logoutBtn);
    container.appendChild(card);

    main.replaceChildren(container);
}
