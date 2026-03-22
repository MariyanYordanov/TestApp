// Стъпка 11 — questionTemplate.js
// DOM шаблони за въпрос: editable (Стъпка 3) и readonly (Стъпка 4).
// Без innerHTML за потребителски данни — само createElement/textContent.

// ---------------------------------------------------------------------------
// buildQuestionCard — editable карта за Стъпка 3 (Въпроси)
//
// @param {object} question   — обект с id, text, answers[]
// @param {number} index      — 0-базиран индекс (показва се като index+1)
// @param {object} callbacks  — { onChange(patch), onRemove() }
// ---------------------------------------------------------------------------
export function buildQuestionCard(question, index, { onChange, onRemove }) {
    // Radio group е уникален по question.id — не е нужен споделен брояч
    const groupName = `correct-answer-${question.id}`;

    const card = document.createElement('div');
    card.className = 'question-card card';
    card.dataset.questionId = question.id;

    // --- Хедър на въпроса ---
    card.appendChild(buildQuestionHeader(question, index, { onChange, onRemove }));

    // --- Отговори ---
    const answersSection = document.createElement('div');
    answersSection.className = 'answers-section';
    answersSection.dataset.answersFor = question.id;

    question.answers.forEach(answer => {
        answersSection.appendChild(
            buildAnswerRow(answer, question.id, groupName, onChange)
        );
    });

    card.appendChild(answersSection);

    // --- Бутон "Добави отговор" ---
    const addAnswerBtn = document.createElement('button');
    addAnswerBtn.type = 'button';
    addAnswerBtn.className = 'btn btn-sm btn-secondary';
    addAnswerBtn.dataset.action = 'add-answer';
    addAnswerBtn.dataset.questionId = question.id;
    addAnswerBtn.textContent = 'Добави отговор';
    addAnswerBtn.addEventListener('click', () => onChange({ type: 'add-answer', questionId: question.id }));

    card.appendChild(addAnswerBtn);

    return card;
}

// Хедър — номер + textarea за текст + бутон за премахване
function buildQuestionHeader(question, index, { onChange, onRemove }) {
    const header = document.createElement('div');
    header.className = 'question-header';

    const numberLabel = document.createElement('span');
    numberLabel.className = 'question-number';
    numberLabel.textContent = String(index + 1);

    const textArea = document.createElement('textarea');
    textArea.className = 'form-input question-text';
    textArea.placeholder = 'Текст на въпроса...';
    textArea.value = question.text;
    textArea.addEventListener('input', () => onChange({
        type: 'update-question-text',
        questionId: question.id,
        text: textArea.value,
    }));

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-sm';
    removeBtn.dataset.action = 'remove-question';
    removeBtn.dataset.questionId = question.id;
    removeBtn.textContent = 'Премахни';
    removeBtn.addEventListener('click', () => onRemove(question.id));

    header.appendChild(numberLabel);
    header.appendChild(textArea);
    header.appendChild(removeBtn);

    return header;
}

// Ред за един отговор — radio + input + бутон за премахване
function buildAnswerRow(answer, questionId, groupName, onChange) {
    const row = document.createElement('div');
    row.className = 'answer-row';
    row.dataset.answerId = answer.id;

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = groupName;
    radio.value = answer.id;
    radio.checked = answer.isCorrect;
    radio.addEventListener('change', () => onChange({
        type: 'set-correct-answer',
        questionId,
        answerId: answer.id,
    }));

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
    removeBtn.dataset.questionId = questionId;
    removeBtn.textContent = 'X';
    removeBtn.addEventListener('click', () => onChange({
        type: 'remove-answer',
        questionId,
        answerId: answer.id,
    }));

    row.appendChild(radio);
    row.appendChild(textInput);
    row.appendChild(removeBtn);

    return row;
}

// ---------------------------------------------------------------------------
// buildReadonlyQuestionCard — само за преглед (Стъпка 4)
//
// @param {object} question — обект с id, text, answers[]
// @param {number} index    — 0-базиран индекс
// ---------------------------------------------------------------------------
export function buildReadonlyQuestionCard(question, index) {
    const card = document.createElement('div');
    card.className = 'question-card card readonly-card';
    card.dataset.questionId = question.id;

    // Номер + текст на въпроса
    const header = document.createElement('div');
    header.className = 'question-header';

    const numberLabel = document.createElement('span');
    numberLabel.className = 'question-number';
    numberLabel.textContent = String(index + 1);

    const textEl = document.createElement('p');
    textEl.className = 'question-text';
    textEl.textContent = question.text;

    header.appendChild(numberLabel);
    header.appendChild(textEl);
    card.appendChild(header);

    // Отговори — само текст, маркиран верен/неверен
    const answersList = document.createElement('ul');
    answersList.className = 'answers-list';

    question.answers.forEach(answer => {
        const item = document.createElement('li');
        item.className = 'answer-item';
        item.dataset.correct = String(answer.isCorrect);

        const textEl = document.createElement('span');
        textEl.textContent = answer.text;

        item.appendChild(textEl);
        answersList.appendChild(item);
    });

    card.appendChild(answersList);

    return card;
}
