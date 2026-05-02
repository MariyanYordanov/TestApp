// Стъпка 45 — testEntryView.js
// Участникът влиза в тест по shareCode + въвежда пълно (и евентуално имейл при email gate).
// Зарежда тест от сървъра чрез testService.getPublicTest.
// Използва само createElement/textContent — никога innerHTML с потребителски данни.

import page from '../../../lib/page.min.js';
import * as testService from '../../services/testService.js';
import { formatTime } from '../../utils/timer.js';
import { buildErrorCard } from './participantUtils.js';

// Показва страницата за влизане в тест по shareCode
export async function showTestEntry(ctx) {
    const shareCode = ctx.params.shareCode;
    const main = document.getElementById('main');
    main.className = 'centered';

    // Показва loading state преди API заявката
    const loadingEl = document.createElement('div');
    loadingEl.className = 'loading';
    loadingEl.textContent = 'Зареждане...';
    main.replaceChildren(loadingEl);

    let test;
    try {
        test = await testService.getPublicTest(shareCode);
    } catch (_err) {
        main.replaceChildren(buildErrorCard(shareCode));
        return;
    }

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

    // Banner за целеви класове — показва ги когато тестът е class-gated
    const targetClasses = Array.isArray(test.targetClasses) ? test.targetClasses : [];
    if (targetClasses.length > 0) {
        const banner = document.createElement('div');
        banner.className = 'target-class-banner';
        const label = document.createElement('span');
        label.textContent = targetClasses.length === 1 ? 'Тест за клас: ' : 'Тест за класове: ';
        const value = document.createElement('strong');
        value.textContent = targetClasses.join(', ');
        banner.appendChild(label);
        banner.appendChild(value);
        info.appendChild(banner);
    }

    const title = document.createElement('h2');
    title.textContent = test.title;

    const description = document.createElement('p');
    description.className = 'test-description';
    description.textContent = test.description || '';

    const meta = document.createElement('div');
    meta.className = 'test-meta';

    const questionCount = document.createElement('span');
    questionCount.textContent = `${test.questions.length} въпроса`;

    const sep = document.createElement('span');
    sep.textContent = '·';
    sep.className = 'meta-sep';

    const duration = document.createElement('span');
    duration.textContent = `Времетраене: ${formatTime(test.duration)}`;

    meta.appendChild(questionCount);
    meta.appendChild(sep);
    meta.appendChild(duration);

    info.appendChild(title);
    info.appendChild(description);
    info.appendChild(meta);

    return info;
}

// Форма за въвеждане — само пълно име.
// При class-gated тест backend проверява името срещу класа в students.json.
function buildForm(test) {
    const form = document.createElement('form');
    form.className = 'test-entry-form';
    form.id = 'test-entry-form';

    const errorEl = document.createElement('span');
    errorEl.className = 'field-error';
    errorEl.style.display = 'none';

    const targetClasses = Array.isArray(test.targetClasses) ? test.targetClasses : [];
    const isClassGated = targetClasses.length > 0;

    const nameLabel = document.createElement('label');
    nameLabel.htmlFor = 'participant-name';
    nameLabel.textContent = isClassGated
        ? 'Три имена (както са в класовия списък)'
        : 'Пълно име';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'participant-name';
    nameInput.name = 'participantName';
    nameInput.placeholder = 'Иван Петров Иванов';
    nameInput.autocomplete = 'name';

    form.appendChild(nameLabel);
    form.appendChild(nameInput);
    form.appendChild(errorEl);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-primary';
    submitBtn.textContent = 'Започни теста';
    form.appendChild(submitBtn);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSubmit(test.shareCode, nameInput, errorEl, isClassGated);
    });

    return form;
}

// Валидира и обработва submit. При class-gated тест извиква verify-participant
// endpoint-а ПРЕДИ redirect, за да даде ясен soft refusal без ученикът да губи време.
async function handleSubmit(shareCode, input, errorEl, isClassGated) {
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

    let canonicalName = name;

    if (isClassGated) {
        try {
            const result = await testService.verifyParticipant(shareCode, name);
            // Канонизираме името от directory-то (точно като в class roster-а)
            canonicalName = result?.fullName ?? name;
        } catch (err) {
            errorEl.textContent = err.message || 'Достъпът е отказан.';
            errorEl.style.display = 'block';
            return;
        }
    }

    errorEl.style.display = 'none';

    // Записва канонизираното име в sessionStorage за testTakingView
    const storageKey = `testapp_participant_${shareCode}`;
    sessionStorage.setItem(storageKey, canonicalName);

    const attemptId = `attempt-${Date.now()}`;
    page.redirect(`/test/${shareCode}/take/${attemptId}`);
}
