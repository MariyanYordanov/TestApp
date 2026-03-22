// Стъпка 44 — stepPreviewView.js
// Стъпка 4 от wizard-а: преглед на теста преди запазване.
// Само readonly — без input/textarea полета.
// categories се подава като параметър; onSave callback извиква реалния API.

import page from '../../../lib/page.min.js';
import { buildReadonlyQuestionCard } from '../../templates/questionTemplate.js';

// ---------------------------------------------------------------------------
// renderStepPreview — рендира DOM за Стъпка 4
//
// @param {object}        state      — wizard state
// @param {function}      onBack     — callback при натискане на "Назад"
// @param {Array}         categories — масив с категории от API (по подразбиране [])
// @param {function|null} onSave     — async callback(state) за запазване чрез API
// @returns {HTMLElement}
// ---------------------------------------------------------------------------
export function renderStepPreview(state, onBack, categories = [], onSave = null) {
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
    container.appendChild(buildActionButtons(state, onBack, onSave, container));

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

    section.appendChild(title);
    section.appendChild(description);
    section.appendChild(categoriesEl);
    section.appendChild(meta);

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

// Бутони: "Назад" и "Запази като чернова"
function buildActionButtons(state, onBack, onSave, container) {
    const bar = document.createElement('div');
    bar.className = 'wizard-actions';

    // Бутон "Назад"
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'btn btn-secondary';
    backBtn.dataset.action = 'back';
    backBtn.textContent = 'Назад';
    backBtn.addEventListener('click', () => onBack());

    // Бутон "Запази като чернова"
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn-primary';
    saveBtn.dataset.action = 'save-draft';
    saveBtn.textContent = 'Запази като чернова';

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
            await onSave(state);
            page.redirect('/dashboard');
        } catch (err) {
            // Показваме грешката и активираме бутона отново
            const errorEl = document.createElement('p');
            errorEl.className = 'form-error save-error';
            errorEl.textContent = err.message || 'Грешка при запазване. Опитайте отново.';
            bar.appendChild(errorEl);

            saveBtn.disabled = false;
            saveBtn.textContent = 'Запази като чернова';
        }
    });

    bar.appendChild(backBtn);
    bar.appendChild(saveBtn);

    return bar;
}
