// attemptDetailView.js
// Детайлен преглед на опит — учителят вижда всеки въпрос и отговор на ученика

import * as testService from '../services/testService.js';
import { showToast } from '../utils/notification.js';
import { buildQuestionDetailCard } from '../templates/attemptDetailTemplate.js';

export async function showAttemptDetail(ctx) {
    const { testId, attemptId } = ctx.params;
    const main = document.getElementById('main');

    const loadingEl = document.createElement('div');
    loadingEl.className = 'loading';
    loadingEl.textContent = 'Зареждане...';
    main.replaceChildren(loadingEl);

    try {
        const detail = await testService.getAttemptDetail(testId, attemptId);
        if (!detail) {
            main.replaceChildren(buildNotFound());
            return;
        }
        main.replaceChildren(buildPage(detail, testId, attemptId));
        attachGradeHandler(main, testId, attemptId);
    } catch (err) {
        const errorEl = document.createElement('div');
        errorEl.className = 'error';
        errorEl.textContent = `Грешка: ${err.message}`;
        main.replaceChildren(errorEl);
    }
}

function buildPage(detail, testId, attemptId) {
    const wrapper = document.createElement('div');
    wrapper.className = 'attempt-detail-page';

    // Линк назад
    const backLink = document.createElement('a');
    backLink.href = '/statistics';
    backLink.className = 'btn btn-secondary btn-sm back-link';
    backLink.textContent = '<- Назад';
    wrapper.appendChild(backLink);

    // Заглавие
    const header = document.createElement('div');
    header.className = 'attempt-detail-header';

    const title = document.createElement('h1');
    title.textContent = detail.participantName;
    if (detail.participantGroup) {
        title.textContent += ` - ${detail.participantGroup}`;
    }
    header.appendChild(title);

    const scoreEl = document.createElement('p');
    scoreEl.className = 'attempt-score-summary';
    const maxDisplay = detail.maxScore ?? detail.totalQuestions;
    scoreEl.textContent = `${detail.score} / ${maxDisplay} т. (${detail.percent}%)`;
    header.appendChild(scoreEl);

    // AI бутон (само ако има Open/Code въпроси, които не са оценени)
    if (detail.hasOpenAnswers && !detail.allGraded) {
        const gradeBtn = document.createElement('button');
        gradeBtn.className = 'btn btn-primary grade-btn';
        gradeBtn.textContent = 'Провери с AI';
        gradeBtn.dataset.testId = testId;
        gradeBtn.dataset.attemptId = attemptId;
        header.appendChild(gradeBtn);
    }

    wrapper.appendChild(header);

    // Въпроси
    const questionsSection = document.createElement('div');
    questionsSection.className = 'attempt-questions';
    detail.questions.forEach(q => {
        questionsSection.appendChild(buildQuestionDetailCard(q));
    });
    wrapper.appendChild(questionsSection);

    return wrapper;
}

function attachGradeHandler(main, testId, attemptId) {
    const btn = main.querySelector('.grade-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Проверява...';
        try {
            await testService.gradeAttempt(testId, attemptId);
            showToast('AI проверката завърши.', 'success');
            // Презарежда страницата с обновените оценки
            const detail = await testService.getAttemptDetail(testId, attemptId);
            if (detail) {
                main.replaceChildren(buildPage(detail, testId, attemptId));
                attachGradeHandler(main, testId, attemptId);
            }
        } catch (err) {
            showToast(`Грешка при проверка: ${err.message}`, 'error');
            btn.disabled = false;
            btn.textContent = 'Провери с AI';
        }
    });
}

function buildNotFound() {
    const div = document.createElement('div');
    div.className = 'error-card';
    const p = document.createElement('p');
    p.textContent = 'Опитът не е намерен.';
    const link = document.createElement('a');
    link.href = '/statistics';
    link.className = 'btn btn-secondary';
    link.textContent = '<- Назад';
    div.appendChild(p);
    div.appendChild(link);
    return div;
}
