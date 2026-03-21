// Стъпка 4 — app.js
// Входна точка на приложението.
// Отговорности: инициализира навигацията и стартира router-а.
// Извиква се веднъж при зареждане на страницата.

import page from '../lib/page.min.js';
import { setupNav } from './utils/nav.js';
import { initRoutes } from './router/routes.js';

// Инициализира цялото приложение
function init() {
    setupNav();    // Рендира sidebar навигацията
    initRoutes();  // Регистрира всички URL routes
    page.start();  // Стартира page.js router-а
}

// Изчакваме DOM да е готов преди да стартираме
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
