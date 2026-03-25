// Стъпка 59 — testDetailsView.js
// Страница с детайли за един тест (само четене).
// Route: /tests/:id
//
// Показва:
//   - Заглавие, статус badge, бутон "Редактирай"
//   - Метаданни: описание, share код, продължителност, дата
//   - Брой въпроси
//   - Бутон "Публикувай" (само при Draft)
//   - Брой опити на участници (само при Published)
//   - Линк "Назад" към /dashboard
//
// Builder функциите са в testDetailsHelpers.js (разделени за спазване на <200 реда)

import * as testService from '../services/testService.js';
import { showToast } from '../utils/notification.js';
import {
    buildBackLink,
    buildHeader,
    buildMetaCard,
    buildSummaryCard,
    buildNotFoundCard,
} from './testDetailsHelpers.js';

// ---------------------------------------------------------------------------
// Главна входна точка
// ---------------------------------------------------------------------------

export async function showTestDetails(ctx) {
    const { id } = ctx.params;
    const main = document.getElementById('main');

    // Показваме loading state преди заявката
    const loadingEl = document.createElement('div');
    loadingEl.className = 'loading';
    loadingEl.textContent = 'Зареждане...';
    main.replaceChildren(loadingEl);

    try {
        const test = await testService.getFullTest(id);

        // Тестът не е намерен
        if (!test) {
            main.replaceChildren(buildNotFoundCard());
            return;
        }

        // Зареждаме опитите само за публикувани тестове
        const attempts = test.status === 'Published'
            ? await testService.getAttempts(id).catch(() => [])
            : [];

        const page = document.createElement('div');
        page.className = 'test-details-page';
        page.appendChild(buildBackLink());
        page.appendChild(buildHeader(test, id));
        page.appendChild(buildMetaCard(test));
        const summaryCard = buildSummaryCard(test, attempts);
        if (summaryCard) page.appendChild(summaryCard);
        main.replaceChildren(page);

        // Закачаме event listeners след рендиране
        attachPublishHandler(main, test, ctx);
        attachCopyHandler(main, test.shareCode);

    } catch (err) {
        const errorEl = document.createElement('div');
        errorEl.className = 'error';
        errorEl.textContent = `Грешка при зареждане: ${err.message}`;
        main.replaceChildren(errorEl);
    }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

// Закача handler за бутон "Публикувай"
function attachPublishHandler(main, test, ctx) {
    const publishBtn = main.querySelector('.publish-btn');
    if (!publishBtn) return;

    publishBtn.addEventListener('click', async () => {
        publishBtn.disabled = true;
        try {
            await testService.publishTest(test.id);
            showToast('Тестът е публикуван.', 'success');
            // Презареждаме view-а за да отразим новия статус
            await showTestDetails(ctx);
        } catch (err) {
            showToast(`Грешка при публикуване: ${err.message}`, 'error');
            publishBtn.disabled = false;
        }
    });
}

// Закача handler за бутон "Копирай линк"
function attachCopyHandler(main, shareCode) {
    const copyBtn = main.querySelector('.copy-link-btn');
    if (!copyBtn) return;

    copyBtn.addEventListener('click', async () => {
        // Копира линка за споделяне в клипборда
        const url = `${window.location.origin}/test/${shareCode}`;
        try {
            await navigator.clipboard.writeText(url);
            showToast('Линкът е копиран.', 'success');
        } catch {
            showToast('Не може да се копира линкът.', 'error');
        }
    });
}
