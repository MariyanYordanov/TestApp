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

    header.appendChild(typeTag);
    header.appendChild(verdict);
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

    if (question.gradingStatus === 'Graded' && question.aiFeedback) {
        const feedback = document.createElement('div');
        feedback.className = 'aq-ai-feedback';
        const fLabel = document.createElement('span');
        fLabel.className = 'aq-label';
        fLabel.textContent = 'AI оценка:';
        const fText = document.createElement('p');
        fText.textContent = question.aiFeedback;
        feedback.appendChild(fLabel);
        feedback.appendChild(fText);
        section.appendChild(feedback);
    }

    if (question.gradingStatus === 'Failed') {
        const err = document.createElement('p');
        err.className = 'aq-grading-error';
        err.textContent = 'Автоматичната проверка не успя.';
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

function getCardClass(question) {
    if (!question.scorable) {
        if (question.gradingStatus === 'Graded') {
            return question.aiScore > 0 ? 'verdict-correct' : 'verdict-incorrect';
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
            return question.aiScore > 0 ? 'verdict-correct' : 'verdict-incorrect';
        }
        return 'verdict-pending';
    }
    return question.isCorrect ? 'verdict-correct' : 'verdict-incorrect';
}

function getVerdictText(question) {
    if (!question.scorable) {
        if (question.gradingStatus === 'Graded') return question.aiScore > 0 ? '+ Вярно (AI)' : 'x Грешно (AI)';
        if (question.gradingStatus === 'Pending') return '... Изчаква проверка';
        if (question.gradingStatus === 'Failed') return '! Грешка при проверка';
        return '-';
    }
    return question.isCorrect ? '+ Вярно' : 'x Грешно';
}

function getTypeLabel(type) {
    return { Closed: 'Затворен', Multi: 'Множествен', Open: 'Отворен', Code: 'Код' }[type] ?? type;
}
