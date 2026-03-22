// Стъпка 46 — testTakingView.js
// Участникът решава теста.
// Показва въпроси с radio бутони, таймер и бутон за предаване.
// Използва само createElement/textContent — никога innerHTML с потребителски данни.
//
// Промяна (Седмица 6 — Phase 4):
//   Scoring е преместен на сървъра — collectAnswers() изпраща само { questionId, selectedAnswerId }.
//   Submit извиква testService.submitAttempt и получава AttemptResultResponse.

import page from '../../lib/page.min.js';
import * as testService from '../../services/testService.js';
import { createTimer, formatTime } from '../../utils/timer.js';
import { buildResultsScreen } from './testResultsView.js';
import { buildErrorCard } from './participantUtils.js';

// Модулно ниво state — позволява cleanup при повторно влизане
let activeTimer = null;
let submitted = false;

// Показва страницата за решаване на теста
export async function showTestTaking(ctx) {
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

    main.className = '';
    main.replaceChildren(buildTestScreen(test, participantName, shareCode, attemptId));
}

// --- Изгражда целия екран за решаване на теста ---
function buildTestScreen(test, participantName, shareCode, _attemptId) {
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
        () => { autoSubmit(test, participantName, shareCode, wrapper); }
    );

    // Обработва ръчен submit
    submitBtn.addEventListener('click', () => {
        manualSubmit(test, participantName, shareCode, wrapper, submitBtn);
    });

    return wrapper;
}

// Хедър с заглавие на теста
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

// Събира избраните отговори от DOM — само IDs, БЕЗ scoring (сигурност)
// Scoring се прави изцяло на сървъра
// @returns {Array<{ questionId: string, selectedAnswerId: string|null }>}
function collectAnswers(questions, container) {
    return questions.map(question => {
        const radio = container.querySelector(`input[name="q-${question.id}"]:checked`);
        return {
            questionId: question.id,
            selectedAnswerId: radio ? radio.value : null,
        };
    });
}

// Рендира резултатите от сървъра и спира таймера
function renderResults(test, participantName, container, attemptResult) {
    if (activeTimer) {
        activeTimer.stop();
        activeTimer = null;
    }
    const resultsEl = buildResultsScreen(test, participantName, attemptResult);
    container.replaceWith(resultsEl);
}

// Показва грешка в контейнера при неуспешен submit
function renderSubmitError(container, message) {
    const errorEl = document.createElement('p');
    errorEl.className = 'submit-error';
    errorEl.textContent = `Грешка: ${message}`;
    container.appendChild(errorEl);
}

// Автоматичен submit при изтичане на таймера
async function autoSubmit(test, participantName, shareCode, container) {
    if (submitted) return;
    submitted = true;
    const answers = collectAnswers(test.questions, container);
    try {
        const result = await testService.submitAttempt(shareCode, { participantName, answers });
        renderResults(test, participantName, container, result);
    } catch (err) {
        submitted = false;
        renderSubmitError(container, err.message);
    }
}

// Ръчен submit от бутона
async function manualSubmit(test, participantName, shareCode, container, btn) {
    if (submitted) return;
    submitted = true;
    btn.disabled = true;
    const answers = collectAnswers(test.questions, container);
    try {
        const result = await testService.submitAttempt(shareCode, { participantName, answers });
        renderResults(test, participantName, container, result);
    } catch (err) {
        submitted = false;
        btn.disabled = false;
        renderSubmitError(container, err.message);
    }
}
