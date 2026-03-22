// Стъпка 19 — testTakingView.js
// Участникът решава теста.
// Показва въпроси с radio бутони, таймер и бутон за предаване.
// Използва само createElement/textContent — никога innerHTML с потребителски данни.

import page from '../../lib/page.min.js';
import { findTestByShareCode } from '../../data/mockTests.js';
import { createTimer, formatTime } from '../../utils/timer.js';
import { buildResultsScreen } from './testResultsView.js';
import { buildErrorCard } from './participantUtils.js';

// Модулно ниво state — позволява cleanup при повторно влизане
let activeTimer = null;
let submitted = false;

// Показва страницата за решаване на теста
export function showTestTaking(ctx) {
    const { shareCode, attemptId } = ctx.params;

    // ЗАДЪЛЖИТЕЛНО: reset на submitted flag и cleanup на стар таймер
    submitted = false;
    if (activeTimer) {
        activeTimer.stop();
        activeTimer = null;
    }

    const main = document.getElementById('main');

    // Проверява дали участникът е минал през entry view
    const storageKey = `testapp_participant_${shareCode}`;
    const participantName = sessionStorage.getItem(storageKey);

    if (!participantName) {
        page.redirect(`/test/${shareCode}`);
        return;
    }

    const test = findTestByShareCode(shareCode);

    if (!test) {
        main.replaceChildren(buildErrorCard(shareCode));
        return;
    }

    main.className = '';
    main.replaceChildren(buildTestScreen(test, participantName, shareCode, attemptId));
}

// --- Изгражда целия екран за решаване на теста ---
// shareCode и attemptId са запазени за бъдеща употреба (Седмица 6 — API интеграция)
function buildTestScreen(test, participantName, _shareCode, _attemptId) {
    const wrapper = document.createElement('div');
    wrapper.className = 'test-taking-screen';

    const header = buildHeader(test);
    const timerEl = buildTimerEl();
    const questionsEl = buildQuestionsSection(test.questions);
    const submitBtn = buildSubmitButton();

    wrapper.appendChild(header);
    wrapper.appendChild(timerEl);
    wrapper.appendChild(questionsEl);
    wrapper.appendChild(submitBtn);

    // Стартира таймера след рендиране
    activeTimer = createTimer(
        test.duration,
        (remaining) => { timerEl.textContent = formatTime(remaining); },
        () => { autoSubmit(test, participantName, wrapper); }
    );

    // Обработва ръчен submit
    submitBtn.addEventListener('click', () => {
        manualSubmit(test, participantName, wrapper, submitBtn);
    });

    return wrapper;
}

// Хедър с заглавие на теста и името на участника
function buildHeader(test) {
    const header = document.createElement('div');
    header.className = 'test-header';

    const title = document.createElement('h2');
    title.textContent = test.title;

    header.appendChild(title);
    return header;
}

// Елемент за показване на таймера
function buildTimerEl() {
    const timerEl = document.createElement('div');
    timerEl.id = 'timer';
    timerEl.className = 'test-timer';
    timerEl.textContent = '00:00';
    return timerEl;
}

// Секция с всички въпроси
function buildQuestionsSection(questions) {
    const section = document.createElement('div');
    section.className = 'questions-section';

    questions.forEach(q => {
        section.appendChild(buildQuestionEl(q));
    });

    return section;
}

// Единичен въпрос с radio бутони за отговорите
function buildQuestionEl(question) {
    const el = document.createElement('div');
    el.className = 'question-card';
    el.dataset.questionId = question.id;

    const text = document.createElement('p');
    text.className = 'question-text';
    text.textContent = question.text;

    el.appendChild(text);

    const answersEl = document.createElement('div');
    answersEl.className = 'answers-list';

    question.answers.forEach(answer => {
        answersEl.appendChild(buildAnswerOption(question.id, answer));
    });

    el.appendChild(answersEl);
    return el;
}

// Radio бутон за един отговор
function buildAnswerOption(questionId, answer) {
    const label = document.createElement('label');
    label.className = 'answer-option';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `q-${questionId}`;
    radio.value = answer.id;

    const text = document.createElement('span');
    text.textContent = answer.text;

    label.appendChild(radio);
    label.appendChild(text);
    return label;
}

// Бутон за предаване на теста
function buildSubmitButton() {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.dataset.action = 'submit-test';
    btn.textContent = 'Предай теста';
    return btn;
}

// Събира избраните отговори от формата
function collectAnswers(test, container) {
    return test.questions.map(question => {
        const radio = container.querySelector(`input[name="q-${question.id}"]:checked`);
        const selectedAnswerId = radio ? radio.value : null;
        const correctAnswer = question.answers.find(a => a.isCorrect);
        const correctAnswerId = correctAnswer ? correctAnswer.id : null;

        return {
            questionId: question.id,
            questionText: question.text,
            selectedAnswerId,
            correctAnswerId,
            isCorrect: selectedAnswerId === correctAnswerId,
            answers: question.answers,
        };
    });
}

// Рендира резултатите и спира таймера
// _test е запазен за бъдеща употреба (Седмица 6 — запис на сървъра)
function renderResults(_test, participantName, container, results) {
    if (activeTimer) {
        activeTimer.stop();
        activeTimer = null;
    }
    const resultsEl = buildResultsScreen(results, participantName);
    container.replaceWith(resultsEl);
}

// Автоматичен submit при изтичане на таймера
function autoSubmit(test, participantName, container) {
    if (submitted) return;
    submitted = true;
    const results = collectAnswers(test, container);
    renderResults(test, participantName, container, results);
}

// Ръчен submit от бутона
function manualSubmit(test, participantName, container, btn) {
    if (submitted) return;
    submitted = true;
    btn.disabled = true;
    const results = collectAnswers(test, container);
    renderResults(test, participantName, container, results);
}
