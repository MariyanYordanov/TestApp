// attemptDetailTemplate.js
// Шаблони за детайлен преглед на опит от учителя

// Изгражда карта за един въпрос в детайлния преглед
export function buildQuestionDetailCard(question) {
    const card = document.createElement('div');
    card.className = `attempt-question-card ${getCardClass(question)}`;

    const header = document.createElement('div');
    header.className = 'aq-header';

    const typeTag = document.createElement('span');
    typeTag.className = `aq-type aq-type-${question.questionType.toLowerCase()}`;
    typeTag.textContent = getTypeLabel(question.questionType);

    const verdict = document.createElement('span');
    verdict.className = `aq-verdict ${getVerdictClass(question)}`;
    verdict.textContent = getVerdictText(question);

    // Точки — винаги показваме earned/max
    const points = document.createElement('span');
    points.className = 'aq-points';
    points.textContent = `${getPointsEarned(question)} / ${question.points} т.`;

    header.appendChild(typeTag);
    header.appendChild(verdict);
    header.appendChild(points);
    card.appendChild(header);

    const questionText = document.createElement('p');
    questionText.className = 'aq-question-text';
    questionText.textContent = question.questionText;
    card.appendChild(questionText);

    if (question.questionType === 'Open' || question.questionType === 'Code') {
        card.appendChild(buildOpenAnswerSection(question));
    } else {
        card.appendChild(buildClosedAnswerSection(question));
    }

    return card;
}

function buildClosedAnswerSection(question) {
    const section = document.createElement('div');
    section.className = 'aq-answers';

    question.answers.forEach(answer => {
        const row = document.createElement('div');
        let cls = 'aq-answer-row';
        if (answer.isCorrect) cls += ' answer-correct';
        if (answer.wasSelected && !answer.isCorrect) cls += ' answer-wrong';
        if (answer.wasSelected) cls += ' answer-selected';
        row.className = cls;

        const indicator = document.createElement('span');
        indicator.className = 'aq-answer-indicator';
        indicator.textContent = answer.wasSelected ? '●' : '○';

        const text = document.createElement('span');
        text.textContent = answer.text;

        row.appendChild(indicator);
        row.appendChild(text);
        section.appendChild(row);
    });

    return section;
}

function buildOpenAnswerSection(question) {
    const section = document.createElement('div');
    section.className = 'aq-open-section';

    const studentAnswer = document.createElement('div');
    studentAnswer.className = 'aq-student-answer';
    const label = document.createElement('span');
    label.className = 'aq-label';
    label.textContent = 'Отговор на ученика:';
    const text = document.createElement('p');
    text.className = 'aq-answer-text';
    text.textContent = question.openText || '(без отговор)';
    studentAnswer.appendChild(label);
    studentAnswer.appendChild(text);
    section.appendChild(studentAnswer);

    if (question.sampleAnswer) {
        const sample = document.createElement('div');
        sample.className = 'aq-sample-answer';
        const sLabel = document.createElement('span');
        sLabel.className = 'aq-label';
        sLabel.textContent = 'Примерен отговор:';
        const sText = document.createElement('p');
        sText.className = 'aq-answer-text aq-sample-text';
        sText.textContent = question.sampleAnswer;
        sample.appendChild(sLabel);
        sample.appendChild(sText);
        section.appendChild(sample);
    }

    if (question.gradingStatus === 'Graded') {
        const feedback = document.createElement('div');
        feedback.className = 'aq-ai-feedback';

        const fLabel = document.createElement('span');
        fLabel.className = 'aq-label';
        fLabel.textContent = `AI оценка: ${question.aiScore} / ${question.points} т.`;
        feedback.appendChild(fLabel);

        // Progress bar за визуализация
        feedback.appendChild(buildScoreBar(question.aiScore ?? 0, question.points));

        if (question.aiFeedback) {
            const fText = document.createElement('p');
            fText.className = 'aq-ai-feedback-text';
            fText.textContent = question.aiFeedback;
            feedback.appendChild(fText);
        }
        section.appendChild(feedback);
    }

    if (question.gradingStatus === 'Failed') {
        const err = document.createElement('p');
        err.className = 'aq-grading-error';
        err.textContent = 'Автоматичната проверка не успя. Натиснете „Провери с AI" отново.';
        section.appendChild(err);
    }

    if (question.gradingStatus === 'Pending') {
        const pending = document.createElement('p');
        pending.className = 'aq-grading-pending';
        pending.textContent = 'Изчаква AI проверка...';
        section.appendChild(pending);
    }

    return section;
}

// Progress bar за визуално показване на AI score спрямо max points
function buildScoreBar(score, max) {
    const bar = document.createElement('div');
    bar.className = 'aq-score-bar';
    const fill = document.createElement('div');
    fill.className = `aq-score-bar-fill ${getScoreLevel(score, max)}`;
    const ratio = max > 0 ? Math.min(100, Math.max(0, (score / max) * 100)) : 0;
    fill.style.width = `${ratio}%`;
    bar.appendChild(fill);
    return bar;
}

// Определя нивото на оценката за оцветяване (зелено/жълто/червено)
function getScoreLevel(score, max) {
    if (max <= 0) return 'level-zero';
    const ratio = score / max;
    if (ratio >= 1) return 'level-full';
    if (ratio >= 0.5) return 'level-partial';
    if (ratio > 0) return 'level-low';
    return 'level-zero';
}

// Точки получени за този въпрос
function getPointsEarned(question) {
    if (typeof question.pointsEarned === 'number') return question.pointsEarned;
    // Fallback за стари AttemptDetailResponse-и без pointsEarned
    if (!question.scorable) {
        return question.gradingStatus === 'Graded' ? (question.aiScore ?? 0) : 0;
    }
    return question.isCorrect ? question.points : 0;
}

function getCardClass(question) {
    if (!question.scorable) {
        if (question.gradingStatus === 'Graded') {
            return getScoreVerdictClass(question.aiScore ?? 0, question.points);
        }
        return 'verdict-pending';
    }
    if (question.isCorrect === true) return 'verdict-correct';
    if (question.isCorrect === false) return 'verdict-incorrect';
    return '';
}

function getVerdictClass(question) {
    if (!question.scorable) {
        if (question.gradingStatus === 'Graded') {
            return getScoreVerdictClass(question.aiScore ?? 0, question.points);
        }
        return 'verdict-pending';
    }
    return question.isCorrect ? 'verdict-correct' : 'verdict-incorrect';
}

// Закрити въпроси: бинарно. Open/Code с AI: 3 нива (пълно/частично/грешно).
function getScoreVerdictClass(score, max) {
    if (max <= 0) return 'verdict-incorrect';
    const ratio = score / max;
    if (ratio >= 1) return 'verdict-correct';
    if (ratio > 0) return 'verdict-partial';
    return 'verdict-incorrect';
}

function getVerdictText(question) {
    if (!question.scorable) {
        if (question.gradingStatus === 'Graded') {
            const s = question.aiScore ?? 0;
            const max = question.points ?? 0;
            if (max <= 0) return 'x Грешно';
            const ratio = s / max;
            if (ratio >= 1) return '+ Вярно';
            if (ratio > 0) return '~ Частично';
            return 'x Грешно';
        }
        if (question.gradingStatus === 'Pending') return '... Изчаква проверка';
        if (question.gradingStatus === 'Failed') return '! Грешка при проверка';
        return '-';
    }
    return question.isCorrect ? '+ Вярно' : 'x Грешно';
}

function getTypeLabel(type) {
    return { Closed: 'Затворен', Multi: 'Множествен', Open: 'Отворен', Code: 'Код' }[type] ?? type;
}
