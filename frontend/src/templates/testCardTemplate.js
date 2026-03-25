// Стъпка 10 — testCardTemplate.js
// Изгражда DOM елемент (карта) за един тест в dashboard grid-а.
// Извиква се от dashboardView.js за всеки тест в списъка.
//
// Очакван обект `test`:
//   { id, title, status, questionsCount, attemptsCount, createdAt, shareCode }
//
// Правило (Вариант Б): title и shareCode са потребителски данни
// → вкарват се само с textContent, никога с innerHTML.

import { formatDate } from '../utils/formatDate.js';

// Речник за превод на статусите
const STATUS_LABELS = {
    draft:     'Чернова',
    published: 'Публикуван',
    archived:  'Архивиран',
};

// Изгражда и връща <div class="test-card"> елемент
export function buildTestCard(test) {
    const card = document.createElement('div');
    card.className = 'test-card';
    card.dataset.status = test.status.toLowerCase();

    card.appendChild(buildCardHeader(test));
    card.appendChild(buildCardMeta(test));
    card.appendChild(buildCardFooter(test));

    return card;
}

// Горна част: заглавие + badge за статус
function buildCardHeader(test) {
    const header = document.createElement('div');
    header.className = 'test-card-header';

    // Заглавието идва от потребителя → textContent задължително
    const title = document.createElement('h3');
    title.className = 'test-card-title';
    title.textContent = test.title;

    const badge = document.createElement('span');
    badge.className = `badge badge-${test.status.toLowerCase()}`;
    badge.textContent = STATUS_LABELS[test.status] ?? test.status;

    header.appendChild(title);
    header.appendChild(badge);
    return header;
}

// Средна част: брой въпроси, опити, дата
function buildCardMeta(test) {
    const meta = document.createElement('div');
    meta.className = 'test-card-meta';

    const items = [
        `${test.questionsCount} въпроса`,
        `${test.attemptsCount} опита`,
        formatDate(test.createdAt),
    ];

    items.forEach(value => {
        const span = document.createElement('span');
        span.className = 'meta-item';
        span.textContent = value;
        meta.appendChild(span);
    });

    return meta;
}

// Долна част: share код + бутони за действия
function buildCardFooter(test) {
    const footer = document.createElement('div');
    footer.className = 'test-card-footer';

    // Share кодът идва от сървъра, но го третираме предпазливо
    const codeBox = document.createElement('div');
    codeBox.className = 'share-code';

    const codeLabel = document.createElement('span');
    codeLabel.textContent = 'Код: ';
    codeLabel.className = 'share-code-label';

    const codeValue = document.createElement('code');
    codeValue.textContent = test.shareCode; // textContent — не innerHTML

    codeBox.appendChild(codeLabel);
    codeBox.appendChild(codeValue);

    // Бутони
    const actions = document.createElement('div');
    actions.className = 'test-card-actions';

    actions.appendChild(buildActionLink(`/tests/${test.id}`, 'Детайли', 'btn btn-secondary btn-sm'));

    // Само непубликуваните тестове имат бутон "Редактирай"
    if (test.status !== 'archived') {
        actions.appendChild(buildActionLink(`/tests/${test.id}/edit`, 'Редактирай', 'btn btn-secondary btn-sm'));
    }

    footer.appendChild(codeBox);
    footer.appendChild(actions);
    return footer;
}

// Помощна функция — изгражда линк-бутон
function buildActionLink(href, label, className) {
    const a = document.createElement('a');
    a.href = href;
    a.className = className;
    a.textContent = label;
    return a;
}

// Повторен експорт за обратна съвместимост с тестовете
export { formatDate };
