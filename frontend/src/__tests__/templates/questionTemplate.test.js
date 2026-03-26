// Тестове за templates/questionTemplate.js

const { buildQuestionCard, buildReadonlyQuestionCard } = await import('../../templates/questionTemplate.js');

// Помощна функция за създаване на примерен въпрос
function makeQuestion(overrides = {}) {
    return {
        id: 'q-1',
        text: 'Какво е JavaScript?',
        answers: [
            { id: 'a-1', text: 'Програмен език', isCorrect: true },
            { id: 'a-2', text: 'База данни', isCorrect: false },
        ],
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// buildQuestionCard — editable (за Стъпка 3)
// ---------------------------------------------------------------------------

describe('buildQuestionCard — структура', () => {
    it('връща DOM елемент', () => {
        const q = makeQuestion();
        const card = buildQuestionCard(q, 0, { onChange: vi.fn(), onRemove: vi.fn() });
        expect(card).toBeInstanceOf(HTMLElement);
    });

    it('съдържа индекс на въпроса', () => {
        const q = makeQuestion();
        const card = buildQuestionCard(q, 2, { onChange: vi.fn(), onRemove: vi.fn() });
        expect(card.textContent).toContain('3');
    });

    it('съдържа textarea/input за текст на въпроса', () => {
        const q = makeQuestion();
        const card = buildQuestionCard(q, 0, { onChange: vi.fn(), onRemove: vi.fn() });
        const input = card.querySelector('textarea') || card.querySelector('input[type="text"]');
        expect(input).not.toBeNull();
    });

    it('попълва стойността на въпроса в полето', () => {
        const q = makeQuestion({ text: 'Моят въпрос' });
        const card = buildQuestionCard(q, 0, { onChange: vi.fn(), onRemove: vi.fn() });
        const input = card.querySelector('textarea') || card.querySelector('input[type="text"]');
        expect(input.value).toBe('Моят въпрос');
    });

    it('рендира бутон за премахване на въпроса', () => {
        const q = makeQuestion();
        const card = buildQuestionCard(q, 0, { onChange: vi.fn(), onRemove: vi.fn() });
        const removeBtn = card.querySelector('[data-action="remove-question"]');
        expect(removeBtn).not.toBeNull();
    });

    it('рендира всички отговори', () => {
        const q = makeQuestion();
        const card = buildQuestionCard(q, 0, { onChange: vi.fn(), onRemove: vi.fn() });
        const answerRows = card.querySelectorAll('[data-answer-id]');
        expect(answerRows.length).toBe(2);
    });

    it('рендира бутон "Добави отговор"', () => {
        const q = makeQuestion();
        const card = buildQuestionCard(q, 0, { onChange: vi.fn(), onRemove: vi.fn() });
        const addBtn = card.querySelector('[data-action="add-answer"]');
        expect(addBtn).not.toBeNull();
    });
});

describe('buildQuestionCard — radio бутони за верен отговор', () => {
    it('всеки отговор има radio бутон', () => {
        const q = makeQuestion();
        const card = buildQuestionCard(q, 0, { onChange: vi.fn(), onRemove: vi.fn() });
        const radios = card.querySelectorAll('input[type="radio"]');
        expect(radios.length).toBe(2);
    });

    it('верният отговор има checked radio', () => {
        const q = makeQuestion();
        const card = buildQuestionCard(q, 0, { onChange: vi.fn(), onRemove: vi.fn() });
        const checkedRadio = card.querySelector('input[type="radio"]:checked');
        expect(checkedRadio).not.toBeNull();
        expect(checkedRadio.value).toBe('a-1');
    });

    it('неверните отговори нямат checked radio', () => {
        const q = makeQuestion();
        const card = buildQuestionCard(q, 0, { onChange: vi.fn(), onRemove: vi.fn() });
        const radios = card.querySelectorAll('input[type="radio"]');
        const unchecked = Array.from(radios).filter(r => !r.checked);
        expect(unchecked.length).toBe(1);
        expect(unchecked[0].value).toBe('a-2');
    });
});

describe('buildQuestionCard — callbacks', () => {
    it('onChange се извиква при промяна на текста на въпроса', () => {
        const onChange = vi.fn();
        const q = makeQuestion({ text: '' });
        const card = buildQuestionCard(q, 0, { onChange, onRemove: vi.fn() });
        const input = card.querySelector('textarea') || card.querySelector('input[type="text"]');
        input.value = 'Нов текст';
        input.dispatchEvent(new Event('input'));
        expect(onChange).toHaveBeenCalled();
    });

    it('onRemove се извиква при натискане на бутон за премахване', () => {
        const onRemove = vi.fn();
        const q = makeQuestion();
        const card = buildQuestionCard(q, 0, { onChange: vi.fn(), onRemove });
        const removeBtn = card.querySelector('[data-action="remove-question"]');
        removeBtn.click();
        expect(onRemove).toHaveBeenCalled();
    });

    it('onChange се извиква при промяна на текста на отговор', () => {
        const onChange = vi.fn();
        const q = makeQuestion();
        const card = buildQuestionCard(q, 0, { onChange, onRemove: vi.fn() });
        const answerInputs = card.querySelectorAll('[data-answer-id] input[type="text"]');
        answerInputs[0].value = 'Нов отговор';
        answerInputs[0].dispatchEvent(new Event('input'));
        expect(onChange).toHaveBeenCalled();
    });

    it('onChange се извиква при избор на верен отговор', () => {
        const onChange = vi.fn();
        const q = makeQuestion();
        const card = buildQuestionCard(q, 0, { onChange, onRemove: vi.fn() });
        const radios = card.querySelectorAll('input[type="radio"]');
        radios[1].dispatchEvent(new Event('change'));
        expect(onChange).toHaveBeenCalled();
    });

    it('onChange се извиква при клик на "Добави отговор"', () => {
        const onChange = vi.fn();
        const q = makeQuestion();
        const card = buildQuestionCard(q, 0, { onChange, onRemove: vi.fn() });
        const addBtn = card.querySelector('[data-action="add-answer"]');
        addBtn.click();
        expect(onChange).toHaveBeenCalled();
    });
});

describe('buildQuestionCard — бутон за премахване на отговор', () => {
    it('всеки отговор има бутон за премахване', () => {
        const q = makeQuestion();
        const card = buildQuestionCard(q, 0, { onChange: vi.fn(), onRemove: vi.fn() });
        const removeBtns = card.querySelectorAll('[data-action="remove-answer"]');
        expect(removeBtns.length).toBe(2);
    });

    it('бутонът е disabled при точно 2 отговора (min)', () => {
        const q = makeQuestion();
        const card = buildQuestionCard(q, 0, { onChange: vi.fn(), onRemove: vi.fn() });
        const removeBtns = card.querySelectorAll('[data-action="remove-answer"]');
        removeBtns.forEach(btn => expect(btn.disabled).toBe(true));
    });

    it('onChange се извиква при премахване на отговор (при 3 отговора)', () => {
        const onChange = vi.fn();
        const q = makeQuestion({
            answers: [
                { id: 'a-1', text: 'Отговор 1', isCorrect: true },
                { id: 'a-2', text: 'Отговор 2', isCorrect: false },
                { id: 'a-3', text: 'Отговор 3', isCorrect: false },
            ],
        });
        const card = buildQuestionCard(q, 0, { onChange, onRemove: vi.fn() });
        const removeBtn = card.querySelector('[data-action="remove-answer"]');
        removeBtn.click();
        expect(onChange).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// buildReadonlyQuestionCard — readonly (за Стъпка 4)
// ---------------------------------------------------------------------------

describe('buildReadonlyQuestionCard — структура', () => {
    it('връща DOM елемент', () => {
        const q = makeQuestion();
        const card = buildReadonlyQuestionCard(q, 0);
        expect(card).toBeInstanceOf(HTMLElement);
    });

    it('показва номера на въпроса', () => {
        const q = makeQuestion();
        const card = buildReadonlyQuestionCard(q, 0);
        expect(card.textContent).toContain('1');
    });

    it('показва текста на въпроса', () => {
        const q = makeQuestion({ text: 'Какво е HTML?' });
        const card = buildReadonlyQuestionCard(q, 0);
        expect(card.textContent).toContain('Какво е HTML?');
    });

    it('показва всички отговори', () => {
        const q = makeQuestion();
        const card = buildReadonlyQuestionCard(q, 0);
        expect(card.textContent).toContain('Програмен език');
        expect(card.textContent).toContain('База данни');
    });

    it('не съдържа input или textarea елементи', () => {
        const q = makeQuestion();
        const card = buildReadonlyQuestionCard(q, 0);
        expect(card.querySelectorAll('input, textarea').length).toBe(0);
    });

    it('маркира верния отговор визуално', () => {
        const q = makeQuestion();
        const card = buildReadonlyQuestionCard(q, 0);
        const correctEl = card.querySelector('[data-correct="true"]');
        expect(correctEl).not.toBeNull();
    });

    it('неверните отговори нямат data-correct="true"', () => {
        const q = makeQuestion();
        const card = buildReadonlyQuestionCard(q, 0);
        const wrongEl = card.querySelectorAll('[data-correct="false"]');
        expect(wrongEl.length).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// buildQuestionCard — sampleAnswer за Open и Code въпроси
// ---------------------------------------------------------------------------

describe('buildQuestionCard — sampleAnswer поле', () => {
    it('Open тип рендира textarea за sampleAnswer', () => {
        const q = makeQuestion({ type: 'Open', answers: [] });
        const card = buildQuestionCard(q, 0, { onChange: vi.fn(), onRemove: vi.fn() });
        const ta = card.querySelector('[data-sample-answer-for="q-1"]');
        expect(ta).not.toBeNull();
    });

    it('Code тип рендира textarea за sampleAnswer', () => {
        const q = makeQuestion({ type: 'Code', answers: [] });
        const card = buildQuestionCard(q, 0, { onChange: vi.fn(), onRemove: vi.fn() });
        const ta = card.querySelector('[data-sample-answer-for="q-1"]');
        expect(ta).not.toBeNull();
    });

    it('Open textarea има maxLength 10000', () => {
        const q = makeQuestion({ type: 'Open', answers: [] });
        const card = buildQuestionCard(q, 0, { onChange: vi.fn(), onRemove: vi.fn() });
        const ta = card.querySelector('[data-sample-answer-for="q-1"]');
        expect(ta.maxLength).toBe(10000);
    });

    it('Code textarea има maxLength 50000', () => {
        const q = makeQuestion({ type: 'Code', answers: [] });
        const card = buildQuestionCard(q, 0, { onChange: vi.fn(), onRemove: vi.fn() });
        const ta = card.querySelector('[data-sample-answer-for="q-1"]');
        expect(ta.maxLength).toBe(50000);
    });

    it('textarea стойността отразява question.sampleAnswer', () => {
        const q = makeQuestion({ type: 'Open', answers: [], sampleAnswer: 'Примерен отговор' });
        const card = buildQuestionCard(q, 0, { onChange: vi.fn(), onRemove: vi.fn() });
        const ta = card.querySelector('[data-sample-answer-for="q-1"]');
        expect(ta.value).toBe('Примерен отговор');
    });

    it('Closed тип НЕ рендира textarea за sampleAnswer', () => {
        const q = makeQuestion({ type: 'Closed' });
        const card = buildQuestionCard(q, 0, { onChange: vi.fn(), onRemove: vi.fn() });
        const ta = card.querySelector('[data-sample-answer-for="q-1"]');
        expect(ta).toBeNull();
    });

    it('onChange се извиква с update-sample-answer patch при input в textarea', () => {
        const onChange = vi.fn();
        const q = makeQuestion({ type: 'Open', answers: [], sampleAnswer: '' });
        const card = buildQuestionCard(q, 0, { onChange, onRemove: vi.fn() });
        const ta = card.querySelector('[data-sample-answer-for="q-1"]');
        ta.value = 'Нов примерен отговор';
        ta.dispatchEvent(new Event('input'));
        expect(onChange).toHaveBeenCalledWith({
            type: 'update-sample-answer',
            questionId: 'q-1',
            sampleAnswer: 'Нов примерен отговор',
        });
    });
});

// ---------------------------------------------------------------------------
// buildReadonlyQuestionCard — sampleAnswer за Open и Code въпроси
// ---------------------------------------------------------------------------

describe('buildReadonlyQuestionCard — sampleAnswer', () => {
    it('показва sampleAnswer секция когато sampleAnswer е зададен (Open)', () => {
        const q = makeQuestion({ type: 'Open', answers: [], sampleAnswer: 'Примерен отговор' });
        const card = buildReadonlyQuestionCard(q, 0);
        expect(card.textContent).toContain('Примерен отговор');
    });

    it('НЕ показва sampleAnswer секция когато sampleAnswer е празен', () => {
        const q = makeQuestion({ type: 'Open', answers: [], sampleAnswer: '' });
        const card = buildReadonlyQuestionCard(q, 0);
        const section = card.querySelector('[data-sample-answer-preview]');
        expect(section).toBeNull();
    });

    it('използва <pre> за Code тип', () => {
        const q = makeQuestion({ type: 'Code', answers: [], sampleAnswer: 'print("hello")' });
        const card = buildReadonlyQuestionCard(q, 0);
        const pre = card.querySelector('pre');
        expect(pre).not.toBeNull();
        expect(pre.textContent).toBe('print("hello")');
    });

    it('използва <p> за Open тип', () => {
        const q = makeQuestion({ type: 'Open', answers: [], sampleAnswer: 'Примерен отговор' });
        const card = buildReadonlyQuestionCard(q, 0);
        const section = card.querySelector('[data-sample-answer-preview]');
        expect(section).not.toBeNull();
        const p = section.querySelector('p');
        expect(p).not.toBeNull();
        expect(p.textContent).toBe('Примерен отговор');
    });
});
