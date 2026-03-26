// Стъпка 11 — questionTemplate.js
// DOM шаблони за въпрос: editable (Стъпка 3) и readonly (Стъпка 4).
// Поддържа типове: Closed (радио), Multi (checkbox), Open (без отговори).
// Без innerHTML за потребителски данни — само createElement/textContent.

const QUESTION_TYPES = [
    { value: 'Closed', label: 'Затворен (1 верен)' },
    { value: 'Multi',  label: 'Многократен (няколко верни)' },
    { value: 'Open',   label: 'Отворен (текстов отговор)' },
    { value: 'Code',   label: 'Код (Monaco редактор)' },
];

// ---------------------------------------------------------------------------
// buildQuestionCard — editable карта за Стъпка 3 (Въпроси)
// ---------------------------------------------------------------------------
export function buildQuestionCard(question, index, { onChange, onRemove }) {
    const qType = question.type ?? 'Closed';

    const card = document.createElement('div');
    card.className = 'question-card';
    card.dataset.questionId = question.id;

    card.appendChild(buildQuestionHeader(question, index, qType, { onChange, onRemove }));

    // Отговорите се показват само за Closed и Multi
    const isOpenLike = qType === 'Open' || qType === 'Code';
    if (!isOpenLike) {
        const groupName = `correct-answer-${question.id}`;
        const answersSection = document.createElement('div');
        answersSection.className = 'answers-section';
        answersSection.dataset.answersFor = question.id;

        const answersCount = question.answers.length;
        question.answers.forEach(answer => {
            answersSection.appendChild(
                buildAnswerRow(answer, question.id, groupName, qType, onChange, answersCount)
            );
        });

        card.appendChild(answersSection);

        const addAnswerBtn = document.createElement('button');
        addAnswerBtn.type = 'button';
        addAnswerBtn.className = 'btn btn-sm btn-secondary';
        addAnswerBtn.dataset.action = 'add-answer';
        addAnswerBtn.textContent = '+ Добави отговор';
        addAnswerBtn.disabled = answersCount >= 4;
        addAnswerBtn.addEventListener('click', () => onChange({ type: 'add-answer', questionId: question.id }));
        card.appendChild(addAnswerBtn);
    } else {
        const hint = document.createElement('p');
        hint.className = 'open-question-hint';
        hint.textContent = qType === 'Code'
            ? 'Ученикът ще напише код в Monaco редактора.'
            : 'Ученикът ще напише свободен текстов отговор.';
        card.appendChild(hint);

        // Поле за примерен отговор (незадължително)
        const sampleLabel = document.createElement('label');
        sampleLabel.className = 'form-label sample-answer-label';
        sampleLabel.textContent = 'Примерен отговор (незадължително)';

        const sampleTA = document.createElement('textarea');
        sampleTA.className = 'form-input sample-answer-input';
        sampleTA.dataset.sampleAnswerFor = question.id;
        sampleTA.placeholder = 'Въведете примерен отговор...';
        sampleTA.value = question.sampleAnswer ?? '';
        sampleTA.rows = 3;
        sampleTA.maxLength = qType === 'Code' ? 50000 : 10000;
        sampleTA.addEventListener('input', () => onChange({
            type: 'update-sample-answer',
            questionId: question.id,
            sampleAnswer: sampleTA.value,
        }));

        card.appendChild(sampleLabel);
        card.appendChild(sampleTA);
    }

    return card;
}

// Хедър — горен ред (номер + тип + точки + премахни) + textarea за текст
function buildQuestionHeader(question, index, qType, { onChange, onRemove }) {
    const header = document.createElement('div');
    header.className = 'question-header';

    const topRow = document.createElement('div');
    topRow.className = 'question-top-row';

    const numberLabel = document.createElement('span');
    numberLabel.className = 'question-number';
    numberLabel.textContent = `Въпрос ${index + 1}`;

    const typeSelect = buildTypeSelect(question.id, qType, onChange);

    // Поле за точки
    const pointsWrapper = document.createElement('label');
    pointsWrapper.className = 'question-points-label';
    pointsWrapper.textContent = 'Точки: ';

    const pointsInput = document.createElement('input');
    pointsInput.type = 'number';
    pointsInput.className = 'question-points-input';
    pointsInput.dataset.pointsFor = question.id;
    pointsInput.min = '1';
    pointsInput.max = '100';
    pointsInput.value = String(question.points ?? 1);
    pointsInput.addEventListener('input', () => {
        const val = parseInt(pointsInput.value, 10);
        if (!isNaN(val) && val >= 1) {
            onChange({ type: 'update-question-points', questionId: question.id, points: val });
        }
    });
    pointsWrapper.appendChild(pointsInput);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-sm btn-secondary';
    removeBtn.dataset.action = 'remove-question';
    removeBtn.textContent = 'Премахни';
    removeBtn.addEventListener('click', () => onRemove(question.id));

    topRow.appendChild(numberLabel);
    topRow.appendChild(typeSelect);
    topRow.appendChild(pointsWrapper);
    topRow.appendChild(removeBtn);

    const textArea = document.createElement('textarea');
    textArea.className = 'form-input question-text';
    textArea.placeholder = 'Текст на въпроса...';
    textArea.value = question.text;
    textArea.rows = 2;
    textArea.addEventListener('input', () => onChange({
        type: 'update-question-text',
        questionId: question.id,
        text: textArea.value,
    }));

    header.appendChild(topRow);
    header.appendChild(textArea);

    return header;
}

// Dropdown за тип въпрос
function buildTypeSelect(questionId, currentType, onChange) {
    const select = document.createElement('select');
    select.className = 'question-type-select';
    select.title = 'Тип въпрос';

    QUESTION_TYPES.forEach(({ value, label }) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        opt.selected = value === currentType;
        select.appendChild(opt);
    });

    select.addEventListener('change', () => onChange({
        type: 'update-question-type',
        questionId,
        questionType: select.value,
    }));

    return select;
}

// Ред за един отговор — radio/checkbox + input + бутон за премахване
function buildAnswerRow(answer, questionId, groupName, qType, onChange, totalAnswers) {
    const row = document.createElement('div');
    row.className = 'answer-row';
    row.dataset.answerId = answer.id;

    const inputEl = document.createElement('input');
    if (qType === 'Multi') {
        inputEl.type = 'checkbox';
        inputEl.checked = answer.isCorrect;
        inputEl.addEventListener('change', () => onChange({
            type: 'toggle-correct-answer',
            questionId,
            answerId: answer.id,
        }));
    } else {
        inputEl.type = 'radio';
        inputEl.name = groupName;
        inputEl.value = answer.id;
        inputEl.checked = answer.isCorrect;
        inputEl.addEventListener('change', () => onChange({
            type: 'set-correct-answer',
            questionId,
            answerId: answer.id,
        }));
    }
    inputEl.title = 'Верен отговор';

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.className = 'form-input answer-text';
    textInput.placeholder = 'Текст на отговора...';
    textInput.value = answer.text;
    textInput.addEventListener('input', () => onChange({
        type: 'update-answer-text',
        questionId,
        answerId: answer.id,
        text: textInput.value,
    }));

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-sm';
    removeBtn.dataset.action = 'remove-answer';
    removeBtn.textContent = '×';
    removeBtn.title = 'Премахни отговор';
    removeBtn.disabled = totalAnswers <= 2;
    removeBtn.addEventListener('click', () => onChange({
        type: 'remove-answer',
        questionId,
        answerId: answer.id,
    }));

    row.appendChild(inputEl);
    row.appendChild(textInput);
    row.appendChild(removeBtn);

    return row;
}

// ---------------------------------------------------------------------------
// buildReadonlyQuestionCard — само за преглед (Стъпка 4)
// ---------------------------------------------------------------------------
export function buildReadonlyQuestionCard(question, index) {
    const qType = question.type ?? 'Closed';
    const typeLabels = { Closed: 'Затворен', Multi: 'Многократен', Open: 'Отворен', Code: 'Код' };

    const card = document.createElement('div');
    card.className = 'question-card readonly-card';
    card.dataset.questionId = question.id;

    // Горен ред: номер + тип badge
    const topRow = document.createElement('div');
    topRow.className = 'question-top-row';

    const numberLabel = document.createElement('span');
    numberLabel.className = 'question-number';
    numberLabel.textContent = `Въпрос ${index + 1}`;

    const typeBadge = document.createElement('span');
    typeBadge.className = 'question-type-badge';
    typeBadge.textContent = typeLabels[qType] ?? qType;

    const pointsBadge = document.createElement('span');
    pointsBadge.className = 'question-points-badge';
    pointsBadge.dataset.pointsBadge = '';
    pointsBadge.textContent = `${question.points ?? 1} т.`;

    topRow.appendChild(numberLabel);
    topRow.appendChild(typeBadge);
    topRow.appendChild(pointsBadge);
    card.appendChild(topRow);

    const textEl = document.createElement('p');
    textEl.className = 'question-text-preview';
    textEl.textContent = question.text;
    card.appendChild(textEl);

    if (qType === 'Open' || qType === 'Code') {
        const hint = document.createElement('p');
        hint.className = 'open-question-hint';
        hint.textContent = qType === 'Code'
            ? 'Код въпрос — ученикът пише код в Monaco редактора.'
            : 'Отворен въпрос — свободен текстов отговор.';
        card.appendChild(hint);

        // Показва примерния отговор само ако е зададен
        if (question.sampleAnswer) {
            const section = document.createElement('div');
            section.className = 'sample-answer-preview';
            section.dataset.sampleAnswerPreview = '';

            const sectionLabel = document.createElement('strong');
            sectionLabel.textContent = 'Примерен отговор:';
            section.appendChild(sectionLabel);

            if (qType === 'Code') {
                const pre = document.createElement('pre');
                pre.textContent = question.sampleAnswer;
                section.appendChild(pre);
            } else {
                const p = document.createElement('p');
                p.textContent = question.sampleAnswer;
                section.appendChild(p);
            }

            card.appendChild(section);
        }
    } else {
        const answersList = document.createElement('ul');
        answersList.className = 'answers-preview-list';

        question.answers.forEach(answer => {
            const item = document.createElement('li');
            item.className = answer.isCorrect ? 'answer-preview answer-correct' : 'answer-preview';
            item.dataset.correct = String(answer.isCorrect);

            const indicator = document.createElement('span');
            indicator.className = 'answer-indicator';
            indicator.textContent = answer.isCorrect ? '✓' : '○';

            const textSpan = document.createElement('span');
            textSpan.textContent = answer.text;

            item.appendChild(indicator);
            item.appendChild(textSpan);
            answersList.appendChild(item);
        });

        card.appendChild(answersList);
    }

    return card;
}
