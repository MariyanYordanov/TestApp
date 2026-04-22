// Стъпка 47 — testResultsView.js
// Показва резултатите след завършване на теста.
// БЕЗ page.js зависимост — чист DOM builder.
// Използва само createElement/textContent — никога innerHTML с потребителски данни.

// Изгражда екрана с резултати и го връща като HTMLElement
// @param {object} test              — PublicTestResponse (за lookup на answer текстове)
// @param {string} participantName   — Името на участника
// @param {object} attemptResult     — AttemptResultResponse от сървъра
export function buildResultsScreen(test, participantName, attemptResult) {
    const { score, maxScore, totalQuestions, percent, results } = attemptResult;

    const wrapper = document.createElement('div');
    wrapper.className = 'results-screen';

    wrapper.appendChild(buildHeader(participantName, score, maxScore, totalQuestions, percent, results));
    wrapper.appendChild(buildQuestionList(test, results));
    wrapper.appendChild(buildHomeLink());

    return wrapper;
}

// Хедър с резултата и процента
function buildHeader(participantName, score, maxScore, totalQuestions, percent, results) {
    const header = document.createElement('div');
    header.className = 'results-header';

    const title = document.createElement('h2');
    title.textContent = 'Резултати';

    const nameEl = document.createElement('p');
    nameEl.className = 'results-name';
    nameEl.textContent = participantName;

    // Брой въпроси чакащи AI оценяване
    const pendingCount = results
        ? results.filter(r => r.isCorrect === null || r.isCorrect === undefined).length
        : 0;

    const scoreEl = document.createElement('p');
    scoreEl.className = 'results-score';
    // Показваме точки / макс точки и реален брой въпроси
    scoreEl.textContent = `${score} / ${maxScore ?? totalQuestions} т. • ${totalQuestions} въпроса`;

    const percentEl = document.createElement('p');
    percentEl.className = 'results-percent';
    percentEl.textContent = `${Math.round(percent)}%`;

    header.appendChild(title);
    header.appendChild(nameEl);
    header.appendChild(scoreEl);
    header.appendChild(percentEl);

    // Уведомление за чакащи AI оценки
    if (pendingCount > 0) {
        const pendingEl = document.createElement('p');
        pendingEl.className = 'results-pending-notice';
        pendingEl.textContent = `${pendingCount} ${pendingCount === 1 ? 'въпрос очаква' : 'въпроса очакват'} проверка от ИИ — резултатът ще се обнови.`;
        header.appendChild(pendingEl);
    }

    return header;
}

// Списък с картите за всеки въпрос
function buildQuestionList(test, results) {
    const list = document.createElement('div');
    list.className = 'results-questions';

    results.forEach(result => {
        list.appendChild(buildQuestionCard(test, result));
    });

    return list;
}

// Карта за един въпрос — показва правилно/грешно и текста на избрания отговор
function buildQuestionCard(test, result) {
    const isPending = result.isCorrect === null || result.isCorrect === undefined;
    const cardClass = isPending ? 'question-result pending' : (result.isCorrect ? 'question-result correct' : 'question-result incorrect');

    const card = document.createElement('div');
    card.className = cardClass;

    const questionText = document.createElement('p');
    questionText.className = 'question-result-text';
    questionText.textContent = result.questionText;
    card.appendChild(questionText);

    if (isPending) {
        const pendingLabel = document.createElement('p');
        pendingLabel.className = 'selected-answer answer-pending';
        pendingLabel.textContent = 'Очаква проверка от ИИ...';
        card.appendChild(pendingLabel);
    } else {
        // Намираме текста на избрания отговор от оригиналния тест (lookup по ID)
        const selectedAnswerText = findAnswerText(test, result.questionId, result.selectedAnswerId);
        if (selectedAnswerText !== null) {
            card.appendChild(buildSelectedAnswerEl(selectedAnswerText, result.isCorrect));
        }
    }

    return card;
}

// Търси текста на отговор по questionId и answerId от test.questions
// Връща string или null ако не е намерен / не е избран
function findAnswerText(test, questionId, selectedAnswerId) {
    if (!selectedAnswerId) return null;
    if (!test || !Array.isArray(test.questions)) return null;

    const question = test.questions.find(q => q.id === questionId);
    if (!question) return null;

    const answer = question.answers.find(a => a.id === selectedAnswerId);
    return answer ? answer.text : null;
}

// Показва текста на избрания отговор с индикация верен/грешен
function buildSelectedAnswerEl(answerText, isCorrect) {
    const el = document.createElement('p');
    el.className = isCorrect ? 'selected-answer answer-correct' : 'selected-answer answer-wrong';
    el.textContent = answerText;
    return el;
}

// Link към началната страница
function buildHomeLink() {
    const container = document.createElement('div');
    container.className = 'results-actions';

    const link = document.createElement('a');
    link.href = '/';
    link.className = 'btn btn-primary';
    link.textContent = 'Към началната страница';

    container.appendChild(link);
    return container;
}
