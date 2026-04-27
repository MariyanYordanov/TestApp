// Стъпка 50 — statisticsView.js
// Преглед на статистиката от опитите на участниците.
//
// Функционалност:
//   - Зарежда всички тестове на учителя
//   - Показва dropdown за избор на тест
//   - При избор на тест зарежда и показва опитите в таблица
//   - Email gate тестове: показва void бутон "Разреши повторение"
//   - Показва грешка при неуспешни заявки

import * as testService from '../services/testService.js';
import { buildStatsTable, buildEmptyStatsMessage } from '../templates/statsTableTemplate.js';

export async function showStatistics(_ctx) {
    const main = document.getElementById('main');

    // Показваме loading state
    const loadingEl = document.createElement('div');
    loadingEl.className = 'loading';
    loadingEl.textContent = 'Зареждане...';
    main.replaceChildren(loadingEl);

    let tests;
    try {
        tests = await testService.getMyTests() ?? [];
    } catch (err) {
        const errorEl = document.createElement('div');
        errorEl.className = 'error';
        errorEl.textContent = `Грешка при зареждане на тестовете: ${err.message}`;
        main.replaceChildren(errorEl);
        return;
    }

    main.replaceChildren(buildPage(tests));

    if (tests.length === 0) return;

    // Свързваме select с логиката за зареждане на опити
    const select = main.querySelector('select');
    const statsArea = main.querySelector('#stats-area');

    select.addEventListener('change', () => {
        const testId = select.value;
        if (!testId) return;
        // Намираме избрания тест за да знаем дали има email gate
        const selectedTest = tests.find(t => t.id === testId);
        loadAttempts(testId, statsArea, selectedTest?.requireEmailGate ?? false);
    });
}

// Изгражда цялата страница: заглавие + dropdown + зона за статистика
function buildPage(tests) {
    const wrapper = document.createElement('div');
    wrapper.className = 'statistics-page';

    const h1 = document.createElement('h1');
    h1.textContent = 'Статистика';
    wrapper.appendChild(h1);

    if (tests.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = 'Нямате тестове.';
        wrapper.appendChild(empty);
        return wrapper;
    }

    wrapper.appendChild(buildTestSelector(tests));

    const statsArea = document.createElement('div');
    statsArea.id = 'stats-area';
    wrapper.appendChild(statsArea);

    return wrapper;
}

// Изгражда dropdown за избор на тест
function buildTestSelector(tests) {
    const container = document.createElement('div');
    container.className = 'test-selector';

    const label = document.createElement('label');
    label.textContent = 'Изберете тест:';
    label.htmlFor = 'test-select';

    const select = document.createElement('select');
    select.id = 'test-select';

    // Placeholder опция
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '— изберете тест —';
    select.appendChild(placeholder);

    // Опции за всеки тест
    tests.forEach(test => {
        const option = document.createElement('option');
        option.value = test.id;
        option.textContent = test.title;
        select.appendChild(option);
    });

    container.appendChild(label);
    container.appendChild(select);
    return container;
}

// Зарежда и рендира опитите за избран тест
// showEmailGate: дали да показва void бутон и имейл колона
async function loadAttempts(testId, container, showEmailGate = false) {
    // Показваме loading в зоната за статистика
    const loadingEl = document.createElement('div');
    loadingEl.className = 'loading';
    loadingEl.textContent = 'Зареждане на резултати...';
    container.replaceChildren(loadingEl);

    try {
        const attempts = await testService.getAttempts(testId) ?? [];

        if (attempts.length === 0) {
            container.replaceChildren(buildEmptyStatsMessage());
        } else {
            // Callback за void бутон — анулира опит и презарежда таблицата
            const onVoid = showEmailGate
                ? async (attemptId) => {
                    try {
                        await testService.voidAttempt(testId, attemptId);
                        // Презарежда опитите след успешен void
                        loadAttempts(testId, container, showEmailGate);
                    } catch (err) {
                        const errorEl = document.createElement('div');
                        errorEl.className = 'error';
                        errorEl.textContent = `Грешка при анулиране: ${err.message}`;
                        container.appendChild(errorEl);
                    }
                }
                : null;

            container.replaceChildren(buildStatsTable(attempts, testId, {
                showEmailGate,
                onVoid,
            }));
        }
    } catch (err) {
        const errorEl = document.createElement('div');
        errorEl.className = 'error';
        errorEl.textContent = `Грешка при зареждане на резултатите: ${err.message}`;
        container.replaceChildren(errorEl);
    }
}
