// Стъпка 21 — participantUtils.js
// Споделени DOM помощни функции за participant view-ове.
// Без innerHTML за потребителски данни — само createElement/textContent.

// ---------------------------------------------------------------------------
// buildErrorCard — показва грешка при невалиден shareCode
//
// @param {string} shareCode — невалидният код (само за показване)
// @returns {HTMLElement}
// ---------------------------------------------------------------------------
export function buildErrorCard(shareCode) {
    const card = document.createElement('div');
    card.className = 'error-card';

    const msg = document.createElement('p');
    msg.textContent = `Тест с код "${shareCode}" не е намерен.`;

    const link = document.createElement('a');
    link.href = '/';
    link.className = 'btn btn-secondary';
    link.textContent = 'Назад';

    card.appendChild(msg);
    card.appendChild(link);

    return card;
}
