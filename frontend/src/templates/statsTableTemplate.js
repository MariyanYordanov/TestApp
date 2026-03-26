// Стъпка 49 — statsTableTemplate.js
// Шаблон за таблица с резултати от опити

import page from '../../lib/page.min.js';
import { formatDate } from '../utils/formatDate.js';

// Изчислява процент без деление на нула
function calcPercent(score, total) {
    if (!total) return 0;
    return Math.round((score / total) * 100);
}

// Изгражда ред за един опит в таблицата
// attempt: { id, participantName, score, totalQuestions, createdAt }
// testId: GUID на теста — нужен за навигация към детайлния преглед
export function buildStatsRow(attempt, testId) {
    const tr = document.createElement('tr');

    // Кликване върху ред отваря детайлния преглед на опита
    if (testId && attempt.id) {
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => {
            page(`/tests/${testId}/attempts/${attempt.id}`);
        });
    }

    // Клетка: участник
    const tdName = document.createElement('td');
    tdName.textContent = attempt.participantName;

    // Клетка: резултат (напр. "8/10")
    const tdScore = document.createElement('td');
    tdScore.textContent = `${attempt.score}/${attempt.totalQuestions}`;

    // Клетка: процент с цветово кодиране
    const tdPercent = document.createElement('td');
    const pct = calcPercent(attempt.score, attempt.totalQuestions);
    tdPercent.textContent = `${pct}%`;
    tdPercent.className = pct >= 70 ? 'pct-high' : pct >= 40 ? 'pct-mid' : 'pct-low';

    // Клетка: дата
    const tdDate = document.createElement('td');
    tdDate.textContent = formatDate(attempt.createdAt);

    tr.appendChild(tdName);
    tr.appendChild(tdScore);
    tr.appendChild(tdPercent);
    tr.appendChild(tdDate);

    return tr;
}

// Изгражда цялата таблица с опити
// attempts: масив от опити — не се мутира
// testId: GUID на теста — предава се на buildStatsRow за навигация
export function buildStatsTable(attempts, testId) {
    const table = document.createElement('table');
    table.className = 'stats-table';

    // Заглавен ред
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Участник', 'Резултат', 'Процент', 'Дата'].forEach(label => {
        const th = document.createElement('th');
        th.textContent = label;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Тяло — итерираме без мутация
    const tbody = document.createElement('tbody');
    attempts.forEach(attempt => tbody.appendChild(buildStatsRow(attempt, testId)));
    table.appendChild(tbody);

    return table;
}

// Показва съобщение при липса на опити
export function buildEmptyStatsMessage() {
    const p = document.createElement('p');
    p.className = 'empty-state';
    p.textContent = 'Няма опити за избрания тест.';
    return p;
}
