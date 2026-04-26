// Стъпка 44 — stepPreviewView.js
// Стъпка 4 от wizard-а: преглед на теста преди запазване.
// Само readonly — без input/textarea полета.
// categories се подава като параметър; onSave callback извиква реалния API.

import page from '../../../lib/page.min.js';
import { buildReadonlyQuestionCard } from '../../templates/questionTemplate.js';
import { showToast } from '../../utils/notification.js';

// ---------------------------------------------------------------------------
// renderStepPreview — рендира DOM за Стъпка 4
//
// @param {object}        state      — wizard state
// @param {function}      onBack     — callback при натискане на "Назад"
// @param {Array}         categories — масив с категории от API (по подразбиране [])
// @param {function|null} onSave     — async callback(state) за запазване чрез API
// @returns {HTMLElement}
// ---------------------------------------------------------------------------
export function renderStepPreview(state, onBack, categories = [], onSave = null, editId = null) {
    const container = document.createElement('div');
    container.className = 'step-content step-preview';

    // Заглавие на стъпката
    const heading = document.createElement('h2');
    heading.textContent = 'Преглед на теста';
    container.appendChild(heading);

    // Секция: обобщена информация
    container.appendChild(buildSummarySection(state, categories));

    // Секция: въпроси (readonly)
    container.appendChild(buildQuestionsSection(state));

    // Навигационни бутони
    container.appendChild(buildActionButtons(state, onBack, onSave, container, editId));

    return container;
}

// Обобщена информация за теста
function buildSummarySection(state, categories) {
    const section = document.createElement('div');
    section.className = 'preview-summary card';

    const title = document.createElement('h3');
    title.textContent = state.title;

    const description = document.createElement('p');
    description.className = 'preview-description';
    description.textContent = state.description;

    // Избрани категории — имената се търсят в подадения масив
    const categoryIds = state.categoryIds ?? [];
    const categoryNames = categories
        .filter(c => categoryIds.includes(c.id))
        .map(c => c.name)
        .join(', ');
    const categoriesEl = document.createElement('p');
    categoriesEl.className = 'preview-categories';
    categoriesEl.textContent = `Категории: ${categoryNames || '—'}`;

    const meta = document.createElement('p');
    meta.className = 'preview-meta';
    meta.textContent = `Въпроси: ${state.questions.length}`;

    // Продължителност в минути
    const durationEl = document.createElement('p');
    durationEl.className = 'preview-duration';
    durationEl.textContent = `Продължителност: ${state.durationMinutes ?? 30} минути`;

    section.appendChild(title);
    section.appendChild(description);
    section.appendChild(categoriesEl);
    section.appendChild(meta);
    section.appendChild(durationEl);

    return section;
}

// Секция с readonly карти за всеки въпрос
function buildQuestionsSection(state) {
    const section = document.createElement('div');
    section.className = 'preview-questions';

    const sectionTitle = document.createElement('h3');
    sectionTitle.textContent = 'Въпроси';
    section.appendChild(sectionTitle);

    state.questions.forEach((question, index) => {
        section.appendChild(buildReadonlyQuestionCard(question, index));
    });

    return section;
}

// Бутони: "Откажи", "Назад" и "Запази като чернова"
function buildActionButtons(state, onBack, onSave, container, editId) {
    const bar = document.createElement('div');
    bar.className = 'wizard-nav';

    // Бутон "Откажи"
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.dataset.action = 'cancel';
    cancelBtn.textContent = 'Откажи';
    cancelBtn.addEventListener('click', () => {
        page.redirect(editId ? `/tests/${editId}` : '/dashboard');
    });
    bar.appendChild(cancelBtn);

    const rightGroup = document.createElement('div');
    rightGroup.className = 'wizard-nav-right';

    // Бутон "Назад"
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'btn btn-secondary';
    backBtn.dataset.action = 'back';
    backBtn.textContent = 'Назад';
    backBtn.addEventListener('click', () => onBack());
    rightGroup.appendChild(backBtn);

    // Бутон "Запази като чернова"
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn-primary';
    saveBtn.dataset.action = 'save-draft';
    saveBtn.textContent = editId ? 'Запази промените' : 'Запази като чернова';

    saveBtn.addEventListener('click', async () => {
        if (!onSave) {
            // Backward compatibility: без onSave просто пренасочваме
            page.redirect('/dashboard');
            return;
        }

        // Показваме loading state на бутона
        saveBtn.disabled = true;
        saveBtn.textContent = 'Запазване...';

        // Премахваме предишни грешки
        const prevError = container.querySelector('.save-error');
        if (prevError) prevError.remove();

        try {
            const saved = await onSave(state);
            showToast(editId ? 'Промените са запазени.' : 'Тестът е запазен успешно.', 'success');
            page.redirect(saved?.id ? `/tests/${saved.id}` : '/dashboard');
        } catch (err) {
            const errorEl = document.createElement('p');
            errorEl.className = 'form-error save-error';
            errorEl.textContent = err.message || 'Грешка при запазване. Опитайте отново.';
            rightGroup.appendChild(errorEl);

            saveBtn.disabled = false;
            saveBtn.textContent = editId ? 'Запази промените' : 'Запази като чернова';
        }
    });

    rightGroup.appendChild(saveBtn);
    bar.appendChild(rightGroup);

    return bar;
}
