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
// attempt: { id, participantName, participantEmail, score, totalQuestions, createdAt, isVoided }
// testId: GUID на теста — нужен за навигация към детайлния преглед
// options: { showEmailGate, onVoid }
export function buildStatsRow(attempt, testId, options = {}) {
    const { showEmailGate = false, onVoid = null } = options;
    const tr = document.createElement('tr');

    // Воидирани редове — по-бледи
    if (attempt.isVoided) {
        tr.className = 'attempt-voided';
    }

    // Кликване върху ред отваря детайлния преглед на опита (само неvoided)
    if (testId && attempt.id && !attempt.isVoided) {
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', (e) => {
            // Не навигираме ако е кликнато на void бутона
            if (e.target.closest('[data-void]')) return;
            page(`/tests/${testId}/attempts/${attempt.id}`);
        });
    }

    // Клетка: участник (+ имейл при email gate)
    const tdName = document.createElement('td');
    tdName.textContent = attempt.participantName;
    if (showEmailGate && attempt.participantEmail) {
        const emailSpan = document.createElement('span');
        emailSpan.className = 'attempt-email';
        emailSpan.textContent = ` (${attempt.participantEmail})`;
        tdName.appendChild(emailSpan);
    }

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

    // Клетка: "Разреши повторение" бутон (само за email gate тестове)
    if (showEmailGate && onVoid && !attempt.isVoided) {
        const tdVoid = document.createElement('td');
        const voidBtn = document.createElement('button');
        voidBtn.className = 'btn btn-sm btn-secondary void-btn';
        voidBtn.textContent = 'Разреши повторение';
        voidBtn.setAttribute('data-void', attempt.id);
        voidBtn.title = 'Анулира опита и позволява повторно решаване';
        voidBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onVoid(attempt.id);
        });
        tdVoid.appendChild(voidBtn);
        tr.appendChild(tdVoid);
    } else if (showEmailGate) {
        // Празна клетка за да се запази colspan
        const tdEmpty = document.createElement('td');
        if (attempt.isVoided) {
            tdEmpty.textContent = 'Анулиран';
            tdEmpty.className = 'text-muted';
        }
        tr.appendChild(tdEmpty);
    }

    return tr;
}

// Изгражда цялата таблица с опити
// attempts: масив от опити — не се мутира
// testId: GUID на теста — предава се на buildStatsRow за навигация
// options: { showEmailGate, onVoid }
export function buildStatsTable(attempts, testId, options = {}) {
    const { showEmailGate = false, onVoid = null } = options;
    const table = document.createElement('table');
    table.className = 'stats-table';

    // Заглавен ред
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['Участник', 'Резултат', 'Процент', 'Дата'];
    if (showEmailGate) headers.push('Действие');
    headers.forEach(label => {
        const th = document.createElement('th');
        th.textContent = label;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Тяло — итерираме без мутация
    const tbody = document.createElement('tbody');
    attempts.forEach(attempt => tbody.appendChild(
        buildStatsRow(attempt, testId, { showEmailGate, onVoid })
    ));
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
