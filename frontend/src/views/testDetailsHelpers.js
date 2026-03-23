// Стъпка 59 — testDetailsHelpers.js
// Помощни builder функции за testDetailsView.js.
// Разделени тук за да спазим лимита от 200 реда за файл.

import { formatDate } from '../utils/formatDate.js';

// Речник за превод на статусите
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

    const h1 = document.createElement('h1');
    h1.textContent = test.title; // textContent — потребителски данни

    const badge = document.createElement('span');
    badge.className = `badge badge-${test.status.toLowerCase()}`;
    badge.textContent = STATUS_LABELS[test.status] ?? test.status;

    titleRow.appendChild(h1);
    titleRow.appendChild(badge);

    const editLink = document.createElement('a');
    editLink.href = `/tests/${id}/edit`;
    editLink.className = 'btn btn-secondary';
    editLink.textContent = 'Редактирай';

    header.appendChild(titleRow);
    header.appendChild(editLink);
    return header;
}

// Карта с метаданни: описание, share код, продължителност, дата
export function buildMetaCard(test) {
    const card = document.createElement('div');
    card.className = 'meta-card';

    if (test.description) {
        const desc = document.createElement('p');
        desc.className = 'test-description';
        desc.textContent = test.description; // textContent — потребителски данни
        card.appendChild(desc);
    }

    // Share код с бутон "Копирай линк"
    const shareRow = document.createElement('div');
    shareRow.className = 'share-row';

    const shareLabel = document.createElement('span');
    shareLabel.textContent = 'Код за споделяне: ';

    const shareCode = document.createElement('code');
    shareCode.className = 'share-code-value';
    shareCode.textContent = test.shareCode; // textContent — данни от сървъра

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-secondary btn-sm copy-link-btn';
    copyBtn.textContent = 'Копирай линк';
    copyBtn.dataset.shareCode = test.shareCode;

    shareRow.appendChild(shareLabel);
    shareRow.appendChild(shareCode);
    shareRow.appendChild(copyBtn);
    card.appendChild(shareRow);

    // Продължителност (ако е зададена)
    if (test.duration) {
        const duration = document.createElement('p');
        duration.className = 'test-duration';
        duration.textContent = `Продължителност: ${Math.round(test.duration / 60)} мин.`;
        card.appendChild(duration);
    }

    // Дата на създаване
    const created = document.createElement('p');
    created.className = 'test-created';
    created.textContent = `Създаден: ${formatDate(test.createdAt)}`;
    card.appendChild(created);

    return card;
}

// Карта с обобщение: брой въпроси, опити, action бутони
export function buildSummaryCard(test, attempts) {
    const card = document.createElement('div');
    card.className = 'summary-card';

    // Брой въпроси
    const questionsCount = document.createElement('p');
    questionsCount.className = 'questions-count';
    const count = Array.isArray(test.questions) ? test.questions.length : 0;
    questionsCount.textContent = `Въпроси: ${count}`;
    card.appendChild(questionsCount);

    // Брой опити (само за публикувани тестове)
    if (test.status === 'Published') {
        const attemptsCount = document.createElement('p');
        attemptsCount.className = 'attempts-count';
        attemptsCount.textContent = `Опити: ${attempts.length}`;
        card.appendChild(attemptsCount);
    }

    // Бутон "Публикувай" само за Draft
    if (test.status === 'Draft') {
        const publishBtn = document.createElement('button');
        publishBtn.className = 'btn btn-primary publish-btn';
        publishBtn.textContent = 'Публикувай';
        publishBtn.dataset.testId = test.id;
        card.appendChild(publishBtn);
    }

    return card;
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
