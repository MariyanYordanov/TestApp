// testTakingView.js
// Участникът решава теста — по един въпрос на страница.
// Поддържа три типа въпроси: Closed (radio), Multi (checkbox), Open (textarea).
// State се пази в closure — currentIndex и answers Map.

import page from '../../../lib/page.min.js';
import * as testService from '../../services/testService.js';
import { createTimer, formatTime } from '../../utils/timer.js';
import { buildResultsScreen } from './testResultsView.js';
import { buildErrorCard } from './participantUtils.js';

// Модулно ниво — cleanup при повторно влизане
let activeTimer = null;
let submitted = false;

// Monaco редактор — инстанции по questionId
const monacoEditors = new Map();
let monacoLoadPromise = null;

// Зарежда Monaco от CDN веднъж (singleton).
// При грешка нулира Promise-а за следващ опит.
function ensureMonacoLoaded() {
    if (monacoLoadPromise) return monacoLoadPromise;
    monacoLoadPromise = new Promise((resolve, reject) => {
        if (window.monaco) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js';
        script.crossOrigin = 'anonymous';
        script.integrity = 'sha384-SF/kPhqG3NMxqsYAbQqHkdF53WQx8yTkY0Ys+M+ayeC20QNujPyyxIuUEdEf0eG/';
        script.onload = () => {
            window.require.config({
                paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' },
            });
            window.require(['vs/editor/editor.main'], resolve, reject);
        };
        script.onerror = () => reject(new Error('Monaco CDN не е достъпен.'));
        document.head.appendChild(script);
    }).catch(err => {
        monacoLoadPromise = null; // позволява повторен опит при следваща навигация
        throw err;
    });
    return monacoLoadPromise;
}

export async function showTestTaking(ctx) {
    const { shareCode, attemptId } = ctx.params;

    submitted = false;
    if (activeTimer) { activeTimer.stop(); activeTimer = null; }
    monacoEditors.forEach(editor => editor.dispose());
    monacoEditors.clear();

    const main = document.getElementById('main');
    const storageKey = `testapp_participant_${shareCode}`;
    const participantName = sessionStorage.getItem(storageKey);
    if (!participantName) { page.redirect(`/test/${shareCode}`); return; }

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
    if (!test) { main.replaceChildren(buildErrorCard(shareCode)); return; }

    main.className = '';
    main.replaceChildren(buildTestScreen(test, participantName, shareCode, attemptId));
}

// ---------------------------------------------------------------------------
// Изгражда целия екран
// ---------------------------------------------------------------------------
function buildTestScreen(test, participantName, shareCode, _attemptId) {
    submitted = false;
    let currentIndex = 0;
    const answers = new Map(); // questionId → string | string[] | null

    const wrapper = document.createElement('div');
    wrapper.className = 'test-taking-screen';

    const stickyHeader = buildStickyHeader(test);
    const progressEl = document.createElement('div');
    progressEl.className = 'question-progress';
    const questionArea = document.createElement('div');
    questionArea.className = 'question-area';
    const navRow = document.createElement('div');
    navRow.className = 'test-nav-row';

    wrapper.appendChild(stickyHeader);
    wrapper.appendChild(progressEl);
    wrapper.appendChild(questionArea);
    wrapper.appendChild(navRow);

    function navigate(newIndex) {
        answers.set(test.questions[currentIndex].id,
            readAnswer(test.questions[currentIndex], questionArea));
        currentIndex = newIndex;
        updateProgress(progressEl, test.questions.length, currentIndex);
        renderQuestion(test.questions[currentIndex], questionArea, answers);
        updateNav(navRow, test, currentIndex, navigate, handleSubmit);
    }

    function handleSubmit() {
        if (submitted) return;
        answers.set(test.questions[currentIndex].id,
            readAnswer(test.questions[currentIndex], questionArea));
        manualSubmit(test, participantName, shareCode, wrapper, answers);
    }

    // Начален рендер
    updateProgress(progressEl, test.questions.length, 0);
    renderQuestion(test.questions[0], questionArea, answers);
    updateNav(navRow, test, 0, navigate, handleSubmit);

    // Таймер в sticky header
    const timerDisplay = stickyHeader.querySelector('.timer-display');
    if (test.duration) {
        timerDisplay.textContent = formatTime(test.duration);
        activeTimer = createTimer(
            test.duration,
            (remaining) => {
                timerDisplay.textContent = formatTime(remaining);
                if (remaining < 60) timerDisplay.classList.add('timer-warning');
            },
            () => {
                answers.set(test.questions[currentIndex].id,
                    readAnswer(test.questions[currentIndex], questionArea));
                autoSubmit(test, participantName, shareCode, wrapper, answers);
            }
        );
    }

    return wrapper;
}

// ---------------------------------------------------------------------------
// Sticky header — заглавие + таймер
// ---------------------------------------------------------------------------
function buildStickyHeader(test) {
    const header = document.createElement('div');
    header.className = 'test-sticky-header';

    const title = document.createElement('span');
    title.className = 'sticky-title';
    title.textContent = test.title;

    const timerDisplay = document.createElement('span');
    timerDisplay.className = 'timer-display';
    timerDisplay.textContent = test.duration ? formatTime(test.duration) : '—';

    header.appendChild(title);
    header.appendChild(timerDisplay);
    return header;
}

// ---------------------------------------------------------------------------
// Progress dots
// ---------------------------------------------------------------------------
function updateProgress(container, total, activeIndex) {
    container.replaceChildren();
    for (let i = 0; i < total; i++) {
        const dot = document.createElement('span');
        dot.className = i === activeIndex ? 'question-dot active' : 'question-dot';
        dot.textContent = i + 1;
        container.appendChild(dot);
    }
}

// ---------------------------------------------------------------------------
// Въпрос
// ---------------------------------------------------------------------------
async function renderQuestion(question, container, answers) {
    const questionEl = buildQuestionEl(question, answers.get(question.id));
    container.replaceChildren(questionEl);

    if ((question.type || '').toLowerCase() === 'code') {
        const editorDiv = questionEl.querySelector(`[data-monaco-for="${question.id}"]`);
        const fallbackTA = questionEl.querySelector(`#code-fallback-${question.id}`);
        if (!editorDiv) return;
        try {
            await ensureMonacoLoaded();
            if (!editorDiv.isConnected) return; // потребителят е навигирал
            // Прехвърля съдържанието от fallback textarea в Monaco
            const initialValue = fallbackTA ? fallbackTA.value : (answers.get(question.id) || '');
            const existing = monacoEditors.get(question.id);
            if (existing) existing.dispose();
            const editor = window.monaco.editor.create(editorDiv, {
                value: initialValue,
                language: 'javascript',
                theme: 'vs',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                fontSize: 14,
            });
            monacoEditors.set(question.id, editor);
            // Показва Monaco, скрива fallback
            if (fallbackTA) fallbackTA.style.display = 'none';
            editorDiv.style.display = '';
        } catch (_err) {
            // Monaco не успя — fallback textarea остава видима
            if (fallbackTA && fallbackTA.isConnected) {
                fallbackTA.placeholder = 'Редакторът не можа да се зареди. Пиши тук.';
            }
        }
    }
}

function buildQuestionEl(question, savedAnswer) {
    const el = document.createElement('div');
    el.className = 'question-card';
    el.dataset.questionId = question.id;

    const text = document.createElement('p');
    text.className = 'question-text';
    text.textContent = question.text;
    el.appendChild(text);

    const type = (question.type || '').toLowerCase();
    if (type === 'code') {
        el.appendChild(buildCodeAnswer(question.id, savedAnswer));
    } else if (type === 'open') {
        el.appendChild(buildOpenAnswer(question.id, savedAnswer));
    } else if (type === 'multi') {
        el.appendChild(buildChoiceAnswers(question, savedAnswer, 'checkbox'));
    } else {
        el.appendChild(buildChoiceAnswers(question, savedAnswer, 'radio'));
    }

    return el;
}

// Radio или Checkbox отговори
function buildChoiceAnswers(question, savedAnswer, inputType) {
    const list = document.createElement('div');
    list.className = 'answers-list';
    const selected = Array.isArray(savedAnswer) ? savedAnswer : (savedAnswer ? [savedAnswer] : []);

    question.answers.forEach(answer => {
        const label = document.createElement('label');
        label.className = 'answer-option';

        const input = document.createElement('input');
        input.type = inputType;
        input.name = `q-${question.id}`;
        input.value = answer.id;
        if (selected.includes(answer.id)) input.checked = true;

        const span = document.createElement('span');
        span.textContent = answer.text;

        label.appendChild(input);
        label.appendChild(span);
        list.appendChild(label);
    });

    return list;
}

// Textarea за отворен отговор
function buildOpenAnswer(questionId, savedAnswer) {
    const wrapper = document.createElement('div');
    const textarea = document.createElement('textarea');
    textarea.className = 'open-answer-textarea';
    textarea.id = `open-${questionId}`;
    textarea.placeholder = 'Напиши своя отговор тук...';
    textarea.rows = 4;
    if (savedAnswer) textarea.value = savedAnswer;
    wrapper.appendChild(textarea);
    return wrapper;
}

// Monaco container с textarea fallback (пази съдържанието докато редакторът се зарежда)
function buildCodeAnswer(questionId, savedAnswer) {
    const wrapper = document.createElement('div');
    wrapper.className = 'code-answer-wrapper';

    // Textarea fallback — видима само докато Monaco се зарежда
    const fallback = document.createElement('textarea');
    fallback.id = `code-fallback-${questionId}`;
    fallback.className = 'open-answer-textarea code-fallback';
    fallback.placeholder = 'Зареждане на редактора... (можеш да пишеш тук)';
    fallback.rows = 8;
    fallback.spellcheck = false;
    if (savedAnswer) fallback.value = savedAnswer;
    wrapper.appendChild(fallback);

    const editorDiv = document.createElement('div');
    editorDiv.dataset.monacoFor = questionId;
    editorDiv.className = 'monaco-editor-container';
    editorDiv.style.display = 'none'; // скрито докато Monaco не е готов
    wrapper.appendChild(editorDiv);

    return wrapper;
}

// Чете отговора от DOM
function readAnswer(question, container) {
    const type = (question.type || '').toLowerCase();
    if (type === 'code') {
        const editor = monacoEditors.get(question.id);
        if (editor) return editor.getValue().trim() || null;
        // Monaco не е зареден — чете от fallback textarea
        const fallback = container.querySelector(`#code-fallback-${question.id}`);
        return fallback ? fallback.value.trim() || null : null;
    }
    if (type === 'open') {
        const ta = container.querySelector(`#open-${question.id}`);
        return ta ? ta.value.trim() || null : null;
    }
    if (type === 'multi') {
        const checked = [...container.querySelectorAll(`input[name="q-${question.id}"]:checked`)];
        return checked.length > 0 ? checked.map(c => c.value) : null;
    }
    const radio = container.querySelector(`input[name="q-${question.id}"]:checked`);
    return radio ? radio.value : null;
}

// ---------------------------------------------------------------------------
// Навигационен ред
// ---------------------------------------------------------------------------
function updateNav(container, test, currentIndex, navigate, handleSubmit) {
    container.replaceChildren();
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === test.questions.length - 1;

    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-secondary';
    prevBtn.textContent = '← Назад';
    prevBtn.style.visibility = isFirst ? 'hidden' : 'visible';
    prevBtn.addEventListener('click', () => navigate(currentIndex - 1));

    const nextBtn = document.createElement('button');
    if (isLast) {
        nextBtn.className = 'btn btn-primary';
        nextBtn.textContent = 'Предай теста';
        nextBtn.addEventListener('click', handleSubmit);
    } else {
        nextBtn.className = 'btn btn-secondary';
        nextBtn.textContent = 'Напред →';
        nextBtn.addEventListener('click', () => navigate(currentIndex + 1));
    }

    container.appendChild(prevBtn);
    container.appendChild(nextBtn);
}

// ---------------------------------------------------------------------------
// Submit helpers
// ---------------------------------------------------------------------------
function collectAllAnswers(questions, answers) {
    const result = [];
    questions.forEach(q => {
        const answer = answers.get(q.id);
        const type = (q.type || '').toLowerCase();
        if (type === 'open' || type === 'code') {
            result.push({ questionId: q.id, selectedAnswerId: null, openText: answer || null });
        } else if (type === 'multi') {
            const ids = Array.isArray(answer) ? answer : [];
            if (ids.length > 0) {
                ids.forEach(id => result.push({ questionId: q.id, selectedAnswerId: id, openText: null }));
            } else {
                result.push({ questionId: q.id, selectedAnswerId: null, openText: null });
            }
        } else {
            result.push({ questionId: q.id, selectedAnswerId: answer || null, openText: null });
        }
    });
    return result;
}

function renderResults(test, participantName, container, attemptResult) {
    if (activeTimer) { activeTimer.stop(); activeTimer = null; }
    container.replaceWith(buildResultsScreen(test, participantName, attemptResult));
}

function renderSubmitError(container, message) {
    const errorEl = document.createElement('p');
    errorEl.className = 'submit-error';
    errorEl.textContent = `Грешка: ${message}`;
    container.appendChild(errorEl);
}

async function autoSubmit(test, participantName, shareCode, container, answers) {
    if (submitted) return;
    submitted = true;
    const payload = { participantName, answers: collectAllAnswers(test.questions, answers) };
    try {
        const result = await testService.submitAttempt(shareCode, payload);
        renderResults(test, participantName, container, result);
    } catch (err) {
        submitted = false;
        renderSubmitError(container, err.message);
    }
}

async function manualSubmit(test, participantName, shareCode, container, answers) {
    if (submitted) return;
    submitted = true;
    const payload = { participantName, answers: collectAllAnswers(test.questions, answers) };
    try {
        const result = await testService.submitAttempt(shareCode, payload);
        renderResults(test, participantName, container, result);
    } catch (err) {
        submitted = false;
        renderSubmitError(container, err.message);
    }
}
