// testDetailsHelpers.js
// Builder функции за testDetailsView.js — модерен layout.

import { formatDate } from '../utils/formatDate.js';

const STATUS_LABELS = {
    Draft:     'Чернова',
    Published: 'Публикуван',
    Archived:  'Архивиран',
};

// Линк "Назад" към dashboard
export function buildBackLink() {
    const link = document.createElement('a');
    link.href = '/dashboard';
    link.className = 'btn btn-secondary btn-sm back-link';
    link.textContent = '← Назад';
    return link;
}

// Хедър: заглавие + status badge + бутон "Редактирай"
export function buildHeader(test, id) {
    const header = document.createElement('div');
    header.className = 'page-header';

    const titleRow = document.createElement('div');
    titleRow.className = 'title-row';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'title-group';

    const h1 = document.createElement('h1');
    h1.textContent = test.title;

    const badge = document.createElement('span');
    badge.className = `badge badge-${test.status.toLowerCase()}`;
    badge.textContent = STATUS_LABELS[test.status] ?? test.status;

    titleGroup.appendChild(h1);
    titleGroup.appendChild(badge);

    const editLink = document.createElement('a');
    editLink.href = `/tests/${id}/edit`;
    editLink.className = 'btn btn-secondary';
    editLink.textContent = 'Редактирай';

    titleRow.appendChild(titleGroup);
    titleRow.appendChild(editLink);
    header.appendChild(titleRow);
    return header;
}

// Модерна карта с метаданни: share код + info grid
export function buildMetaCard(test) {
    const card = document.createElement('div');
    card.className = 'test-details-meta';

    // Описание (ако има)
    if (test.description) {
        const desc = document.createElement('p');
        desc.className = 'test-description';
        desc.style.cssText = 'margin-bottom:1.25rem;color:var(--color-text-muted);line-height:1.6';
        desc.textContent = test.description;
        card.appendChild(desc);
    }

    // Share код — видима секция
    const shareSection = document.createElement('div');
    shareSection.className = 'share-code-section';

    const shareLabel = document.createElement('span');
    shareLabel.className = 'share-code-label';
    shareLabel.textContent = 'Код за споделяне:';

    const shareVal = document.createElement('code');
    shareVal.className = 'share-code-value';
    shareVal.textContent = test.shareCode;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-secondary btn-sm copy-link-btn';
    copyBtn.textContent = 'Копирай линк';

    shareSection.appendChild(shareLabel);
    shareSection.appendChild(shareVal);
    shareSection.appendChild(copyBtn);
    card.appendChild(shareSection);

    // Info grid: въпроси, продължителност, дата
    const grid = document.createElement('div');
    grid.className = 'details-grid';

    const questionCount = Array.isArray(test.questions) ? test.questions.length : 0;
    grid.appendChild(buildDetailItem(questionCount, 'Въпроси'));

    if (test.duration) {
        grid.appendChild(buildDetailItem(`${Math.round(test.duration / 60)} мин`, 'Продължителност'));
    }

    grid.appendChild(buildDetailItem(formatDate(test.createdAt), 'Създаден'));

    card.appendChild(grid);
    return card;
}

// Карта с обобщение: опити + action бутони
export function buildSummaryCard(test, attempts) {
    const card = document.createElement('div');
    card.className = 'test-details-meta';

    if (test.status === 'Published') {
        const grid = document.createElement('div');
        grid.className = 'details-grid';
        grid.style.marginBottom = '1.25rem';
        grid.appendChild(buildDetailItem(attempts.length, 'Опити'));
        card.appendChild(grid);
    }

    const actionsBar = document.createElement('div');
    actionsBar.className = 'test-actions-bar';

    if (test.status === 'Draft') {
        const publishBtn = document.createElement('button');
        publishBtn.className = 'btn btn-primary publish-btn';
        publishBtn.textContent = 'Публикувай теста';
        actionsBar.appendChild(publishBtn);
    }

    // Архивиране — налично за Draft и Published
    if (test.status === 'Draft' || test.status === 'Published') {
        const archiveBtn = document.createElement('button');
        archiveBtn.className = 'btn btn-secondary archive-btn';
        archiveBtn.textContent = 'Архивирай';
        actionsBar.appendChild(archiveBtn);
    }

    // Възстановяване — само за Archived
    if (test.status === 'Archived') {
        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'btn btn-primary restore-btn';
        restoreBtn.textContent = 'Възстанови (към Чернова)';
        actionsBar.appendChild(restoreBtn);
    }

    if (actionsBar.children.length > 0) card.appendChild(actionsBar);

    // Ако няма нищо за показване — върни null
    if (card.children.length === 0) return null;
    return card;
}

// Помощна функция за detail-item
function buildDetailItem(value, label) {
    const item = document.createElement('div');
    item.className = 'detail-item';

    const val = document.createElement('span');
    val.className = 'detail-value';
    val.textContent = value;

    const lbl = document.createElement('span');
    lbl.className = 'detail-label';
    lbl.textContent = label;

    item.appendChild(val);
    item.appendChild(lbl);
    return item;
}

// Карта "Тестът не е намерен"
export function buildNotFoundCard() {
    const card = document.createElement('div');
    card.className = 'error-card';

    const msg = document.createElement('p');
    msg.textContent = 'Тестът не е намерен.';

    const backLink = document.createElement('a');
    backLink.href = '/dashboard';
    backLink.className = 'btn btn-secondary';
    backLink.textContent = '← Назад';

    card.appendChild(msg);
    card.appendChild(backLink);
    return card;
}
