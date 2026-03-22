// Стъпка 49 — statsTableTemplate.js
// Шаблон за таблица с резултати от опити

// Форматира дата за показване в bg-BG формат
function formatDate(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Изчислява процент без деление на нула
function calcPercent(score, total) {
    if (!total) return 0;
    return Math.round((score / total) * 100);
}

// Изгражда ред за един опит в таблицата
// attempt: { participantName, score, totalQuestions, createdAt }
export function buildStatsRow(attempt) {
    const tr = document.createElement('tr');

    // Клетка: участник
    const tdName = document.createElement('td');
    tdName.textContent = attempt.participantName;

    // Клетка: резултат (напр. "8/10")
    const tdScore = document.createElement('td');
    tdScore.textContent = `${attempt.score}/${attempt.totalQuestions}`;

    // Клетка: процент
    const tdPercent = document.createElement('td');
    const pct = calcPercent(attempt.score, attempt.totalQuestions);
    tdPercent.textContent = `${pct}%`;

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
export function buildStatsTable(attempts) {
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
    attempts.forEach(attempt => tbody.appendChild(buildStatsRow(attempt)));
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
