// Стъпка 18 — testEntryView.js
// Участникът влиза в тест по shareCode + въвежда пълно име.
// Зарежда тест от mockTests и показва информация преди старт.
// Използва само createElement/textContent — никога innerHTML с потребителски данни.

import page from '../../lib/page.min.js';
import { findTestByShareCode } from '../../data/mockTests.js';
import { formatTime } from '../../utils/timer.js';
import { buildErrorCard } from './participantUtils.js';

// Показва страницата за влизане в тест по shareCode
export function showTestEntry(ctx) {
    const shareCode = ctx.params.shareCode;
    const main = document.getElementById('main');
    main.className = 'centered';

    const test = findTestByShareCode(shareCode);

    if (!test) {
        main.replaceChildren(buildErrorCard(shareCode));
        return;
    }

    main.replaceChildren(buildEntryForm(test));
}

// --- Изгражда формата за влизане в теста ---
function buildEntryForm(test) {
    const wrapper = document.createElement('div');
    wrapper.className = 'test-entry-card';

    wrapper.appendChild(buildTestInfo(test));
    wrapper.appendChild(buildForm(test));

    return wrapper;
}

// Информационна секция с детайли на теста
function buildTestInfo(test) {
    const info = document.createElement('div');
    info.className = 'test-entry-info';

    const title = document.createElement('h2');
    title.textContent = test.title;

    const description = document.createElement('p');
    description.className = 'test-description';
    description.textContent = test.description || '';

    const meta = document.createElement('div');
    meta.className = 'test-meta';

    const questionCount = document.createElement('span');
    questionCount.textContent = `${test.questions.length} въпроса`;

    const duration = document.createElement('span');
    duration.textContent = `Времетраене: ${formatTime(test.duration)}`;

    meta.appendChild(questionCount);
    meta.appendChild(duration);

    info.appendChild(title);
    info.appendChild(description);
    info.appendChild(meta);

    return info;
}

// Форма за въвеждане на пълно име
function buildForm(test) {
    const form = document.createElement('form');
    form.className = 'test-entry-form';
    form.id = 'test-entry-form';

    const label = document.createElement('label');
    label.htmlFor = 'participant-name';
    label.textContent = 'Пълно име';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'participant-name';
    input.name = 'participantName';
    input.placeholder = 'Въведи пълното си име';
    input.autocomplete = 'name';

    const errorEl = document.createElement('span');
    errorEl.className = 'field-error';
    errorEl.style.display = 'none';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-primary';
    submitBtn.textContent = 'Започни теста';

    form.appendChild(label);
    form.appendChild(input);
    form.appendChild(errorEl);
    form.appendChild(submitBtn);

    // Обработва submit на формата
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSubmit(test.shareCode, input, errorEl);
    });

    return form;
}

// Валидира и обработва submit — записва в sessionStorage и пренасочва
function handleSubmit(shareCode, input, errorEl) {
    const name = input.value.trim();

    if (name.length < 2) {
        errorEl.textContent = 'Моля въведи пълното си име (минимум 2 символа).';
        errorEl.style.display = 'block';
        return;
    }

    if (name.length > 100) {
        errorEl.textContent = 'Името е твърде дълго (максимум 100 символа).';
        errorEl.style.display = 'block';
        return;
    }

    // Скрива грешката ако има
    errorEl.style.display = 'none';

    // Записва участника в sessionStorage
    const storageKey = `testapp_participant_${shareCode}`;
    sessionStorage.setItem(storageKey, name);

    // Пренасочва към view-а за решаване на теста
    const attemptId = `attempt-${Date.now()}`;
    page.redirect(`/test/${shareCode}/take/${attemptId}`);
}
