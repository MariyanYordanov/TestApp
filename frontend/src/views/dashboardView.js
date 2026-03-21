// Стъпка 9 — dashboardView.js
// Списък с тестовете на учителя.
// СЕГА: работи с MOCK данни (hardcoded масив).
// ПОСЛЕ (Седмица 6): заменяме MOCK_TESTS с реална api.get('/tests') заявка.
//
// Функционалност:
//   - Показва тестовете като карти в grid
//   - Филтри: Всички / Чернови / Публикувани / Архивирани
//   - Бутон "Нов тест" → /tests/create

import { buildTestCard } from '../templates/testCardTemplate.js';

// --- MOCK данни — заменят се с API в Седмица 6 ---
const MOCK_TESTS = [
    {
        id: '1',
        title: 'Тест по JavaScript — масиви и функции',
        status: 'published',
        questionsCount: 10,
        attemptsCount: 23,
        createdAt: '2026-03-01T10:00:00Z',
        shareCode: 'JS001234',
    },
    {
        id: '2',
        title: 'Тест по C# — класове и наследяване',
        status: 'draft',
        questionsCount: 8,
        attemptsCount: 0,
        createdAt: '2026-03-15T14:30:00Z',
        shareCode: 'CS005678',
    },
    {
        id: '3',
        title: 'Тест по математика — функции',
        status: 'archived',
        questionsCount: 15,
        attemptsCount: 45,
        createdAt: '2026-02-10T09:00:00Z',
        shareCode: 'MT009012',
    },
];

// Текущо активен филтър
let activeFilter = 'all';

export function showDashboard() {
    const main = document.getElementById('main');
    main.className = ''; // премахваме 'centered' от login страницата

    // Зареждаме mock данните директно (без async)
    // Когато свързваме с API → ще стане async и ще добавим loading state
    const tests = MOCK_TESTS;

    main.replaceChildren(
        buildPageHeader(),
        buildFilters(tests),
        buildGrid(tests),
    );
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
