// classesView.js
// Управление на класове и ученици (students.json чрез API).
// Учителят може: добавя/преименува/изтрива класове и ученици,
// масово импортира ученици чрез paste от CSV.

import * as testService from '../services/testService.js';
import { showToast } from '../utils/notification.js';

export async function showClasses() {
    const main = document.getElementById('main');
    main.replaceChildren(buildLoading());

    try {
        const classes = await testService.getAllClasses();
        main.replaceChildren(buildPage(classes ?? []));
        attachHandlers(main);
    } catch (err) {
        main.replaceChildren(buildError(err.message));
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

function buildPage(classes) {
    const wrapper = document.createElement('div');
    wrapper.className = 'classes-page';

    const header = document.createElement('div');
    header.className = 'classes-header';

    const title = document.createElement('h1');
    title.textContent = 'Класове и ученици';
    header.appendChild(title);

    const newBtn = document.createElement('button');
    newBtn.className = 'btn btn-primary';
    newBtn.dataset.action = 'new-class';
    newBtn.textContent = '+ Нов клас';
    header.appendChild(newBtn);

    wrapper.appendChild(header);

    if (classes.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = 'Няма създадени класове все още. Натиснете „+ Нов клас".';
        wrapper.appendChild(empty);
        return wrapper;
    }

    const list = document.createElement('div');
    list.className = 'classes-list';
    classes.forEach(c => list.appendChild(buildClassCard(c)));
    wrapper.appendChild(list);

    return wrapper;
}

function buildClassCard(cls) {
    const card = document.createElement('details');
    card.className = 'class-card';
    card.dataset.className = cls.name;

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

    // Бутони действия
    const actions = document.createElement('div');
    actions.className = 'class-actions';

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-sm btn-secondary';
    addBtn.dataset.action = 'add-student';
    addBtn.dataset.className = cls.name;
    addBtn.textContent = '+ Добави ученик';
    actions.appendChild(addBtn);

    const bulkBtn = document.createElement('button');
    bulkBtn.className = 'btn btn-sm btn-secondary';
    bulkBtn.dataset.action = 'bulk-import';
    bulkBtn.dataset.className = cls.name;
    bulkBtn.textContent = '📋 Масов импорт (CSV)';
    actions.appendChild(bulkBtn);

    const renameBtn = document.createElement('button');
    renameBtn.className = 'btn btn-sm btn-secondary';
    renameBtn.dataset.action = 'rename-class';
    renameBtn.dataset.className = cls.name;
    renameBtn.textContent = 'Преименувай';
    actions.appendChild(renameBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-danger';
    deleteBtn.dataset.action = 'delete-class';
    deleteBtn.dataset.className = cls.name;
    deleteBtn.textContent = 'Изтрий клас';
    actions.appendChild(deleteBtn);

    body.appendChild(actions);
    card.appendChild(body);

    return card;
}

function buildStudentRow(className, student) {
    const row = document.createElement('div');
    row.className = 'student-row';
    row.dataset.email = student.email;

    const info = document.createElement('span');
    info.className = 'student-info';
    info.textContent = `${student.email} — ${student.fullName}`;
    row.appendChild(info);

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-sm btn-secondary';
    editBtn.dataset.action = 'edit-student';
    editBtn.dataset.className = className;
    editBtn.dataset.email = student.email;
    editBtn.dataset.fullName = student.fullName;
    editBtn.textContent = 'Редактирай';
    row.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm btn-danger';
    delBtn.dataset.action = 'delete-student';
    delBtn.dataset.className = className;
    delBtn.dataset.email = student.email;
    delBtn.textContent = 'Изтрий';
    row.appendChild(delBtn);

    return row;
}

function pluralize(n) {
    return n === 1 ? 'ученик' : 'ученика';
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function attachHandlers(main) {
    main.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const className = btn.dataset.className;
        const email = btn.dataset.email;

        try {
            if (action === 'new-class') return await onNewClass();
            if (action === 'rename-class') return await onRenameClass(className);
            if (action === 'delete-class') return await onDeleteClass(className);
            if (action === 'add-student') return await onAddStudent(className);
            if (action === 'edit-student') return await onEditStudent(className, email, btn.dataset.fullName);
            if (action === 'delete-student') return await onDeleteStudent(className, email);
            if (action === 'bulk-import') return await onBulkImport(className);
        } catch (err) {
            showToast(err.message || 'Грешка', 'error');
        }
    });
}

async function onNewClass() {
    const name = prompt('Име на новия клас (напр. 12В):');
    if (!name) return;
    await testService.createClass(name.trim());
    showToast(`Клас „${name}" създаден.`, 'success');
    await showClasses();
}

async function onRenameClass(oldName) {
    const newName = prompt(`Ново име на клас „${oldName}":`, oldName);
    if (!newName || newName === oldName) return;
    await testService.renameClass(oldName, newName.trim());
    showToast('Класът е преименуван.', 'success');
    await showClasses();
}

async function onDeleteClass(name) {
    if (!confirm(`Сигурни ли сте? Изтриване на клас „${name}" ще изтрие всички ученици в него.`)) return;
    await testService.deleteClass(name);
    showToast('Класът е изтрит.', 'success');
    await showClasses();
}

async function onAddStudent(className) {
    const email = prompt('Имейл на ученика:');
    if (!email) return;
    const fullName = prompt('Три имена:');
    if (!fullName) return;
    await testService.addStudent(className, email.trim(), fullName.trim());
    showToast('Ученикът е добавен.', 'success');
    await showClasses();
}

async function onEditStudent(className, oldEmail, oldFullName) {
    const newEmail = prompt('Имейл:', oldEmail);
    if (!newEmail) return;
    const newFullName = prompt('Три имена:', oldFullName);
    if (!newFullName) return;
    await testService.updateStudent(className, oldEmail, newEmail.trim(), newFullName.trim());
    showToast('Ученикът е обновен.', 'success');
    await showClasses();
}

async function onDeleteStudent(className, email) {
    if (!confirm(`Изтрий ученик ${email}?`)) return;
    await testService.deleteStudent(className, email);
    showToast('Ученикът е изтрит.', 'success');
    await showClasses();
}

async function onBulkImport(className) {
    const csv = prompt(
        `Поставете CSV редове (email,fullName на всеки ред) за клас „${className}":\n` +
        'Пример:\n' +
        'ivan@school.bg,Иван Петров Иванов\n' +
        'maria@school.bg,Мария Стоянова'
    );
    if (!csv) return;

    const students = csv.split(/\r?\n/)
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
        showToast('Не са намерени валидни редове в CSV.', 'error');
        return;
    }

    const result = await testService.bulkAddStudents(className, students);
    const skipped = result.total - result.added;
    showToast(
        `Добавени ${result.added} от ${result.total}` + (skipped > 0 ? ` (${skipped} пропуснати - вече съществуват или невалидни)` : ''),
        'success'
    );
    await showClasses();
}
