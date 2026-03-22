// Стъпка 5 — routes.js
// Регистрира всички URL адреси (routes) на приложението.
// Публичните routes са достъпни без login.
// Защитените routes минават през authGuard().

import page from '../../lib/page.min.js';

// Lazy imports — всеки view се зарежда само когато е нужен
import { showHome }        from '../views/homeView.js';
import { showLogin }       from '../views/loginView.js';
import { showRegister }    from '../views/registerView.js';
import { showDashboard }   from '../views/dashboardView.js';
import { showCreateTest }  from '../views/createTestView.js';
import { showTestDetails } from '../views/testDetailsView.js';
import { showCategories }  from '../views/categoriesView.js';
import { showStatistics }  from '../views/statisticsView.js';
import { showAccount }     from '../views/accountView.js';
import { showTestEntry }   from '../views/participant/testEntryView.js';
import { showTestTaking }  from '../views/participant/testTakingView.js';
import { isAuthenticated } from '../services/auth.js';

// Middleware — пренасочва към /login ако учителят не е влязъл
export function authGuard(_ctx, next) {
    if (!isAuthenticated()) {
        page.redirect('/login');
        return;
    }
    next();
}

export function initRoutes() {

    // ----------------------------------------------------------
    // Публични routes — достъпни без login
    // ----------------------------------------------------------
    page('/',          showHome);
    page('/login',     showLogin);
    page('/register',  showRegister);

    // ----------------------------------------------------------
    // Ученически routes — без login, достъп по shareCode
    // shareCode е 8-символен код, генериран при публикуване на теста
    // ----------------------------------------------------------
    page('/test/:shareCode',                   showTestEntry);
    page('/test/:shareCode/take/:attemptId',   showTestTaking);

    // ----------------------------------------------------------
    // Учителски routes — изискват JWT токен (authGuard)
    // ----------------------------------------------------------
    page('/dashboard',          authGuard, showDashboard);
    page('/tests/create',       authGuard, showCreateTest);
    page('/tests/:id/edit',     authGuard, showCreateTest);  // същият view, режим "редактиране"
    page('/tests/:id',          authGuard, showTestDetails);
    page('/categories',         authGuard, showCategories);
    page('/statistics',         authGuard, showStatistics);
    page('/account',            authGuard, showAccount);

    // ----------------------------------------------------------
    // 404 — всеки непознат URL
    // Статичен HTML — без потребителски данни → createElement е достатъчен
    // ----------------------------------------------------------
    page('*', () => {
        const main = document.getElementById('main');

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'text-align:center; padding:4rem 1rem;';

        const heading = document.createElement('h1');
        heading.textContent = '404';
        heading.style.cssText = 'font-size:4rem; color:var(--color-border)';

        const msg = document.createElement('p');
        msg.textContent = 'Страницата не е намерена.';
        msg.style.color = 'var(--color-text-muted)';

        const link = document.createElement('a');
        link.href = '/';
        link.textContent = 'Начало';
        link.className = 'btn btn-primary';
        link.style.marginTop = '1.5rem';

        wrapper.appendChild(heading);
        wrapper.appendChild(msg);
        wrapper.appendChild(link);

        main.replaceChildren(wrapper); // replaceChildren изчиства и добавя наведнъж
    });
}
