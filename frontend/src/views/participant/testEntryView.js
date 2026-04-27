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

    // Banner за целеви клас (само когато е зададен)
    if (test.targetClass) {
        const banner = document.createElement('div');
        banner.className = 'target-class-banner';
        banner.setAttribute('data-target-class', test.targetClass);
        const label = document.createElement('span');
        label.textContent = `Клас: `;
        const value = document.createElement('strong');
        value.textContent = test.targetClass;
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

// Форма за въвеждане — с email gate или стандартна (само име)
function buildForm(test) {
    const form = document.createElement('form');
    form.className = 'test-entry-form';
    form.id = 'test-entry-form';

    const errorEl = document.createElement('span');
    errorEl.className = 'field-error';
    errorEl.style.display = 'none';

    let emailInput = null;
    let nameInput = null;

    if (test.requireEmailGate) {
        // --- Email gate flow: показва email поле, после попълва името автоматично ---
        const emailLabel = document.createElement('label');
        emailLabel.htmlFor = 'participant-email';
        emailLabel.textContent = 'Имейл адрес';

        emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.id = 'participant-email';
        emailInput.name = 'participantEmail';
        emailInput.placeholder = 'Въведи своя имейл адрес';
        emailInput.autocomplete = 'email';

        // Поле за пълно име (readonly — попълва се автоматично от директорията)
        const nameLabel = document.createElement('label');
        nameLabel.htmlFor = 'participant-name';
        nameLabel.textContent = 'Пълно име';

        nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'participant-name';
        nameInput.name = 'participantName';
        nameInput.readOnly = true;
        nameInput.className = 'form-input form-input--readonly';
        nameInput.placeholder = 'Ще се попълни автоматично';

        // При blur на email — автоматично попълва името
        emailInput.addEventListener('blur', async () => {
            const emailVal = emailInput.value.trim();
            if (!emailVal) return;
            try {
                const result = await testService.resolveEmail(test.shareCode, emailVal);
                if (result && result.fullName) {
                    nameInput.value = result.fullName;
                    errorEl.style.display = 'none';
                }
            } catch {
                // Не показваме грешка при blur — само при submit
            }
        });

        form.appendChild(emailLabel);
        form.appendChild(emailInput);
        form.appendChild(nameLabel);
        form.appendChild(nameInput);
    } else {
        // --- Стандартен flow: само пълно име ---
        const nameLabel = document.createElement('label');
        nameLabel.htmlFor = 'participant-name';
        nameLabel.textContent = 'Пълно име';

        nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'participant-name';
        nameInput.name = 'participantName';
        nameInput.placeholder = 'Въведи пълното си име';
        nameInput.autocomplete = 'name';

        form.appendChild(nameLabel);
        form.appendChild(nameInput);
    }

    form.appendChild(errorEl);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-primary';
    submitBtn.textContent = 'Започни теста';
    form.appendChild(submitBtn);

    // Обработва submit на формата
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (test.requireEmailGate && emailInput) {
            handleEmailGateSubmit(test.shareCode, emailInput, nameInput, errorEl);
        } else {
            handleSubmit(test.shareCode, nameInput, errorEl);
        }
    });

    return form;
}

// Обработва submit при email gate — проверява имейла в директорията
async function handleEmailGateSubmit(shareCode, emailInput, nameInput, errorEl) {
    const email = emailInput.value.trim();

    if (!email) {
        errorEl.textContent = 'Моля въведи своя имейл адрес.';
        errorEl.style.display = 'block';
        return;
    }

    // Ако не е попълнено иметo от auto-resolve — опитваме отново
    if (!nameInput.value) {
        try {
            const result = await testService.resolveEmail(shareCode, email);
            if (result && result.fullName) {
                nameInput.value = result.fullName;
            } else {
                errorEl.textContent = 'Имейлът не е намерен. Свържете се с учителя си.';
                errorEl.style.display = 'block';
                return;
            }
        } catch {
            errorEl.textContent = 'Имейлът не е намерен. Свържете се с учителя си.';
            errorEl.style.display = 'block';
            return;
        }
    }

    errorEl.style.display = 'none';

    // Записва и пренасочва
    const storageKey = `testapp_participant_${shareCode}`;
    sessionStorage.setItem(storageKey, nameInput.value);
    sessionStorage.setItem(`testapp_email_${shareCode}`, email.toLowerCase());

    const attemptId = `attempt-${Date.now()}`;
    page.redirect(`/test/${shareCode}/take/${attemptId}`);
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
