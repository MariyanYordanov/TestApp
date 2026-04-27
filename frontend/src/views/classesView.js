// classesView.js
// Управление на класове и ученици с inline форми (без prompt()).
// State пази кой клас/ученик в момента се редактира.

import * as testService from '../services/testService.js';
import { showToast } from '../utils/notification.js';

// UI state — какво в момента е в edit/add режим
const ui = {
    classes: [],          // данните от API
    addClassOpen: false,  // показваме ли формата за нов клас
    addStudentFor: null,  // име на класа, в който добавяме ученик (или null)
    editStudent: null,    // { className, email } — ученик в edit режим
    editClassName: null,  // име на класа в rename режим
    bulkImportFor: null,  // име на класа за CSV импорт
};

export async function showClasses() {
    const main = document.getElementById('main');
    main.replaceChildren(buildLoading());

    try {
        ui.classes = await testService.getAllClasses() ?? [];
        render();
    } catch (err) {
        main.replaceChildren(buildError(err.message));
    }
}

// Re-render без нова API заявка — ползва ui.classes от state
function render() {
    const main = document.getElementById('main');
    main.replaceChildren(buildPage());
}

// Re-render и презареждане на класовете от сървъра
async function reload() {
    try {
        ui.classes = await testService.getAllClasses() ?? [];
        render();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ---------------------------------------------------------------------------
// DOM builders
// ---------------------------------------------------------------------------

function buildLoading() {
    const el = document.createElement('div');
    el.className = 'loading';
    el.textContent = 'Зареждане...';
    return el;
}

function buildError(msg) {
    const el = document.createElement('div');
    el.className = 'error';
    el.textContent = `Грешка: ${msg}`;
    return el;
}

function buildPage() {
    const wrapper = document.createElement('div');
    wrapper.className = 'classes-page';

    const header = document.createElement('div');
    header.className = 'classes-header';

    const title = document.createElement('h1');
    title.textContent = 'Класове и ученици';
    header.appendChild(title);

    if (!ui.addClassOpen) {
        const newBtn = button('btn btn-primary', '+ Нов клас', () => {
            ui.addClassOpen = true;
            render();
        });
        header.appendChild(newBtn);
    }

    wrapper.appendChild(header);

    if (ui.addClassOpen) {
        wrapper.appendChild(buildAddClassForm());
    }

    if (ui.classes.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = 'Няма създадени класове. Натиснете „+ Нов клас".';
        wrapper.appendChild(empty);
        return wrapper;
    }

    const list = document.createElement('div');
    list.className = 'classes-list';
    ui.classes.forEach(c => list.appendChild(buildClassCard(c)));
    wrapper.appendChild(list);

    return wrapper;
}

function buildAddClassForm() {
    const card = document.createElement('div');
    card.className = 'inline-form-card';

    const heading = document.createElement('h3');
    heading.textContent = 'Нов клас';
    card.appendChild(heading);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input';
    input.placeholder = 'напр. 12В';
    input.maxLength = 20;
    card.appendChild(input);

    const errorEl = document.createElement('p');
    errorEl.className = 'form-error inline-error';
    errorEl.style.display = 'none';
    card.appendChild(errorEl);

    const actions = document.createElement('div');
    actions.className = 'form-actions';

    const saveBtn = button('btn btn-primary', 'Създай', async () => {
        const name = input.value.trim();
        if (!name) {
            errorEl.textContent = 'Името е задължително.';
            errorEl.style.display = 'block';
            return;
        }
        try {
            await testService.createClass(name);
            showToast(`Клас „${name}" създаден.`, 'success');
            ui.addClassOpen = false;
            await reload();
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
        }
    });
    actions.appendChild(saveBtn);

    const cancelBtn = button('btn btn-secondary', 'Откажи', () => {
        ui.addClassOpen = false;
        render();
    });
    actions.appendChild(cancelBtn);

    card.appendChild(actions);

    setTimeout(() => input.focus(), 0);
    return card;
}

function buildClassCard(cls) {
    const card = document.createElement('details');
    card.className = 'class-card';
    card.dataset.className = cls.name;
    // Запазваме отворено състояние ако имаме активна форма за този клас
    if (
        ui.addStudentFor === cls.name ||
        ui.bulkImportFor === cls.name ||
        ui.editClassName === cls.name ||
        ui.editStudent?.className === cls.name
    ) {
        card.open = true;
    }

    const summary = document.createElement('summary');
    summary.className = 'class-summary';
    const nameEl = document.createElement('span');
    nameEl.className = 'class-name';
    nameEl.textContent = cls.name;
    const countEl = document.createElement('span');
    countEl.className = 'class-count';
    countEl.textContent = ` (${cls.students.length} ${pluralize(cls.students.length)})`;
    summary.appendChild(nameEl);
    summary.appendChild(countEl);
    card.appendChild(summary);

    const body = document.createElement('div');
    body.className = 'class-body';

    if (ui.editClassName === cls.name) {
        body.appendChild(buildRenameClassForm(cls.name));
    }

    // Списък ученици
    const studentsList = document.createElement('div');
    studentsList.className = 'students-list';
    if (cls.students.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'students-empty';
        empty.textContent = 'Няма ученици в този клас.';
        studentsList.appendChild(empty);
    } else {
        cls.students.forEach(s => studentsList.appendChild(buildStudentRow(cls.name, s)));
    }
    body.appendChild(studentsList);

    if (ui.addStudentFor === cls.name) {
        body.appendChild(buildAddStudentForm(cls.name));
    }
    if (ui.bulkImportFor === cls.name) {
        body.appendChild(buildBulkImportForm(cls.name));
    }

    // Действия върху класа
    const actions = document.createElement('div');
    actions.className = 'class-actions';
    if (ui.addStudentFor !== cls.name) {
        actions.appendChild(button('btn btn-sm btn-secondary', '+ Добави ученик', () => {
            ui.addStudentFor = cls.name;
            ui.bulkImportFor = null;
            render();
        }));
    }
    if (ui.bulkImportFor !== cls.name) {
        actions.appendChild(button('btn btn-sm btn-secondary', '📋 Масов импорт (CSV)', () => {
            ui.bulkImportFor = cls.name;
            ui.addStudentFor = null;
            render();
        }));
    }
    if (ui.editClassName !== cls.name) {
        actions.appendChild(button('btn btn-sm btn-secondary', 'Преименувай', () => {
            ui.editClassName = cls.name;
            render();
        }));
    }
    actions.appendChild(button('btn btn-sm btn-danger', 'Изтрий клас', async () => {
        if (!confirm(`Изтрий клас „${cls.name}"? Всички ученици в него ще се загубят.`)) return;
        try {
            await testService.deleteClass(cls.name);
            showToast('Класът е изтрит.', 'success');
            await reload();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }));
    body.appendChild(actions);
    card.appendChild(body);

    return card;
}

function buildStudentRow(className, student) {
    if (ui.editStudent?.className === className && ui.editStudent?.email === student.email) {
        return buildEditStudentForm(className, student);
    }

    const row = document.createElement('div');
    row.className = 'student-row';
    const info = document.createElement('span');
    info.className = 'student-info';
    info.textContent = `${student.email} — ${student.fullName}`;
    row.appendChild(info);
    row.appendChild(button('btn btn-sm btn-secondary', 'Редактирай', () => {
        ui.editStudent = { className, email: student.email };
        render();
    }));
    row.appendChild(button('btn btn-sm btn-danger', 'Изтрий', async () => {
        if (!confirm(`Изтрий ученик ${student.email}?`)) return;
        try {
            await testService.deleteStudent(className, student.email);
            showToast('Ученикът е изтрит.', 'success');
            await reload();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }));
    return row;
}

function buildAddStudentForm(className) {
    const form = document.createElement('div');
    form.className = 'inline-form-card';

    const heading = document.createElement('h3');
    heading.textContent = `Нов ученик в ${className}`;
    form.appendChild(heading);

    const emailInput = labeledInput('Имейл', 'student@school.bg', 'email');
    const nameInput = labeledInput('Три имена', 'Иван Петров Иванов');
    form.appendChild(emailInput.wrapper);
    form.appendChild(nameInput.wrapper);

    const errorEl = document.createElement('p');
    errorEl.className = 'form-error inline-error';
    errorEl.style.display = 'none';
    form.appendChild(errorEl);

    const actions = document.createElement('div');
    actions.className = 'form-actions';
    actions.appendChild(button('btn btn-primary', 'Добави', async () => {
        try {
            await testService.addStudent(className, emailInput.input.value.trim(), nameInput.input.value.trim());
            showToast('Ученикът е добавен.', 'success');
            ui.addStudentFor = null;
            await reload();
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
        }
    }));
    actions.appendChild(button('btn btn-secondary', 'Откажи', () => {
        ui.addStudentFor = null;
        render();
    }));
    form.appendChild(actions);

    setTimeout(() => emailInput.input.focus(), 0);
    return form;
}

function buildEditStudentForm(className, student) {
    const form = document.createElement('div');
    form.className = 'inline-form-card student-edit-card';

    const heading = document.createElement('h3');
    heading.textContent = 'Редакция на ученик';
    form.appendChild(heading);

    const emailInput = labeledInput('Имейл', '', 'email', student.email);
    const nameInput = labeledInput('Три имена', '', 'text', student.fullName);
    form.appendChild(emailInput.wrapper);
    form.appendChild(nameInput.wrapper);

    const errorEl = document.createElement('p');
    errorEl.className = 'form-error inline-error';
    errorEl.style.display = 'none';
    form.appendChild(errorEl);

    const actions = document.createElement('div');
    actions.className = 'form-actions';
    actions.appendChild(button('btn btn-primary', 'Запази', async () => {
        try {
            await testService.updateStudent(
                className,
                student.email,
                emailInput.input.value.trim(),
                nameInput.input.value.trim()
            );
            showToast('Ученикът е обновен.', 'success');
            ui.editStudent = null;
            await reload();
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
        }
    }));
    actions.appendChild(button('btn btn-secondary', 'Откажи', () => {
        ui.editStudent = null;
        render();
    }));
    form.appendChild(actions);

    setTimeout(() => emailInput.input.focus(), 0);
    return form;
}

function buildRenameClassForm(oldName) {
    const form = document.createElement('div');
    form.className = 'inline-form-card';

    const heading = document.createElement('h3');
    heading.textContent = 'Преименуване на клас';
    form.appendChild(heading);

    const nameInput = labeledInput('Ново име', '', 'text', oldName);
    form.appendChild(nameInput.wrapper);

    const errorEl = document.createElement('p');
    errorEl.className = 'form-error inline-error';
    errorEl.style.display = 'none';
    form.appendChild(errorEl);

    const actions = document.createElement('div');
    actions.className = 'form-actions';
    actions.appendChild(button('btn btn-primary', 'Запази', async () => {
        const newName = nameInput.input.value.trim();
        if (!newName || newName === oldName) {
            ui.editClassName = null;
            render();
            return;
        }
        try {
            await testService.renameClass(oldName, newName);
            showToast('Класът е преименуван.', 'success');
            ui.editClassName = null;
            await reload();
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
        }
    }));
    actions.appendChild(button('btn btn-secondary', 'Откажи', () => {
        ui.editClassName = null;
        render();
    }));
    form.appendChild(actions);

    return form;
}

function buildBulkImportForm(className) {
    const form = document.createElement('div');
    form.className = 'inline-form-card';

    const heading = document.createElement('h3');
    heading.textContent = `Масов импорт в ${className}`;
    form.appendChild(heading);

    const help = document.createElement('p');
    help.className = 'help-text';
    help.textContent = 'Поставете редове във формат: email,Три имена (по един на ред)';
    form.appendChild(help);

    const ta = document.createElement('textarea');
    ta.className = 'form-input';
    ta.rows = 6;
    ta.placeholder = 'ivan@school.bg,Иван Петров Иванов\nmaria@school.bg,Мария Стоянова';
    form.appendChild(ta);

    const errorEl = document.createElement('p');
    errorEl.className = 'form-error inline-error';
    errorEl.style.display = 'none';
    form.appendChild(errorEl);

    const actions = document.createElement('div');
    actions.className = 'form-actions';
    actions.appendChild(button('btn btn-primary', 'Импортирай', async () => {
        const students = ta.value.split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => {
                const idx = line.indexOf(',');
                if (idx < 0) return null;
                return {
                    email: line.slice(0, idx).trim(),
                    fullName: line.slice(idx + 1).trim(),
                };
            })
            .filter(s => s && s.email && s.fullName);

        if (students.length === 0) {
            errorEl.textContent = 'Няма валидни редове за импорт.';
            errorEl.style.display = 'block';
            return;
        }

        try {
            const result = await testService.bulkAddStudents(className, students);
            const skipped = result.total - result.added;
            showToast(
                `Добавени ${result.added}/${result.total}` +
                (skipped > 0 ? ` (${skipped} пропуснати — дубликати или невалидни)` : ''),
                'success'
            );
            ui.bulkImportFor = null;
            await reload();
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
        }
    }));
    actions.appendChild(button('btn btn-secondary', 'Откажи', () => {
        ui.bulkImportFor = null;
        render();
    }));
    form.appendChild(actions);

    return form;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function button(className, text, onClick) {
    const b = document.createElement('button');
    b.className = className;
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
}

function labeledInput(label, placeholder, type = 'text', value = '') {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-group';

    const lbl = document.createElement('label');
    lbl.className = 'form-label';
    lbl.textContent = label;

    const input = document.createElement('input');
    input.type = type;
    input.className = 'form-input';
    input.placeholder = placeholder;
    input.value = value;

    wrapper.appendChild(lbl);
    wrapper.appendChild(input);
    return { wrapper, input };
}

function pluralize(n) {
    return n === 1 ? 'ученик' : 'ученика';
}
