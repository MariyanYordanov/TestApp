// Стъпка 41 — dashboardView.js
// Списък с тестовете на учителя.
// Зарежда тестовете от реалния API чрез testService.
//
// Функционалност:
//   - Показва loading state докато се зарежда
//   - Показва тестовете като карти в grid след успешен fetch
//   - Показва грешка при неуспешен fetch
//   - Филтри: Всички / Чернови / Публикувани / Архивирани

import { buildTestCard } from '../templates/testCardTemplate.js';
import * as testService from '../services/testService.js';

// Текущо активен филтър
let activeFilter = 'all';

export async function showDashboard() {
    const main = document.getElementById('main');
    main.className = ''; // Премахваме 'centered' от login страницата

    // Показваме loading state преди заявката
    const loadingEl = document.createElement('div');
    loadingEl.className = 'loading';
    loadingEl.textContent = 'Зареждане...';
    main.replaceChildren(loadingEl);

    try {
        const tests = await testService.getMyTests() ?? [];

        main.replaceChildren(
            buildPageHeader(),
            buildFilters(tests),
            buildGrid(tests),
        );
    } catch (err) {
        // Показваме user-friendly съобщение при грешка
        const errorEl = document.createElement('div');
        errorEl.className = 'error';
        errorEl.textContent = `Грешка при зареждане на тестовете: ${err.message}`;
        main.replaceChildren(errorEl);
    }
}

// Хедър с заглавие и бутон "Нов тест"
function buildPageHeader() {
    const header = document.createElement('div');
    header.className = 'page-header';

    const title = document.createElement('h1');
    title.textContent = 'Моите тестове';

    const newBtn = document.createElement('a');
    newBtn.href = '/tests/create';
    newBtn.className = 'btn btn-primary';
    newBtn.textContent = '+ Нов тест';

    header.appendChild(title);
    header.appendChild(newBtn);
    return header;
}

// Лента с филтри
function buildFilters(tests) {
    const filters = [
        { key: 'all',       label: 'Всички' },
        { key: 'draft',     label: 'Чернови' },
        { key: 'published', label: 'Публикувани' },
        { key: 'archived',  label: 'Архивирани' },
    ];

    const bar = document.createElement('div');
    bar.className = 'filter-bar';

    filters.forEach(f => {
        const count = f.key === 'all'
            ? tests.length
            : tests.filter(t => t.status === f.key).length;

        const btn = document.createElement('button');
        btn.className = `filter-btn${activeFilter === f.key ? ' active' : ''}`;
        btn.dataset.filter = f.key;

        const labelSpan = document.createElement('span');
        labelSpan.textContent = f.label;

        const countSpan = document.createElement('span');
        countSpan.className = 'filter-count';
        countSpan.textContent = count;

        btn.appendChild(labelSpan);
        btn.appendChild(countSpan);
        btn.addEventListener('click', () => applyFilter(f.key, tests));
        bar.appendChild(btn);
    });

    return bar;
}

// Grid с карти на тестовете
function buildGrid(tests) {
    const grid = document.createElement('div');
    grid.className = 'test-grid';
    grid.id = 'test-grid';

    const filtered = activeFilter === 'all'
        ? tests
        : tests.filter(t => t.status === activeFilter);

    if (filtered.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = 'Няма тестове в тази категория.';
        grid.appendChild(empty);
    } else {
        filtered.forEach(test => grid.appendChild(buildTestCard(test)));
    }

    return grid;
}

// Прилага филтър — презарежда само grid-а
function applyFilter(filter, tests) {
    activeFilter = filter;

    // Обновяваме активния бутон
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    // Презареждаме само grid-а, не цялата страница
    const grid = document.getElementById('test-grid');
    if (grid) grid.replaceWith(buildGrid(tests));
}
