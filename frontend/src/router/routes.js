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
import { showAttemptDetail } from '../views/attemptDetailView.js';
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

// Стъпка 59 — routes.js
// Предпазен wrapper за view функции — хваща неочаквани грешки
// и показва user-friendly съобщение вместо бяла страница
export async function safeRender(viewFn, ctx) {
    try {
        await viewFn(ctx);
    } catch (err) {
        console.error('View render error:', err);
        const main = document.getElementById('main');
        if (main) {
            const errEl = document.createElement('div');
            errEl.className = 'error-card';

            const msg = document.createElement('p');
            msg.textContent = 'Нещо се обърка. Моля, опитайте отново.';

            const link = document.createElement('a');
            link.href = '/';
            link.className = 'btn btn-secondary';
            link.textContent = 'Към началото';

            errEl.appendChild(msg);
            errEl.appendChild(link);
            main.innerHTML = '';
            main.appendChild(errEl);
        }
    }
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
    // Всеки view е обвит в safeRender за защита от неочаквани грешки
    // ----------------------------------------------------------
    page('/dashboard',          authGuard, (ctx) => safeRender(showDashboard, ctx));
    page('/tests/create',       authGuard, (ctx) => safeRender(showCreateTest, ctx));
    page('/tests/:id/edit',     authGuard, (ctx) => safeRender(showCreateTest, ctx));  // същият view, режим "редактиране"
    page('/tests/:id',          authGuard, (ctx) => safeRender(showTestDetails, ctx));
    page('/categories',         authGuard, (ctx) => safeRender(showCategories, ctx));
    page('/statistics',         authGuard, (ctx) => safeRender(showStatistics, ctx));
    page('/account',            authGuard, (ctx) => safeRender(showAccount, ctx));
    page('/tests/:testId/attempts/:attemptId', authGuard, (ctx) => safeRender(showAttemptDetail, ctx));

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
