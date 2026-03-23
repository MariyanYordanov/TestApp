// Стъпка 54 — notification.test.js
// Тестове за системата за toast известия.

import { showToast } from '../../utils/notification.js';

// ---------------------------------------------------------------------------
// Помощни функции
// ---------------------------------------------------------------------------

function getContainer() {
    return document.getElementById('notifications');
}

function setupContainer() {
    let container = getContainer();
    if (!container) {
        container = document.createElement('div');
        container.id = 'notifications';
        document.body.appendChild(container);
    }
    return container;
}

function removeContainer() {
    const container = getContainer();
    if (container) container.remove();
}

// ---------------------------------------------------------------------------
// notification — създаване на toast елемент
// ---------------------------------------------------------------------------

describe('showToast — създаване на елемент', () => {
    beforeEach(() => {
        setupContainer();
    });

    afterEach(() => {
        removeContainer();
    });

    it('връща HTMLElement', () => {
        const toast = showToast('Тестово съобщение');
        expect(toast).toBeInstanceOf(HTMLElement);
    });

    it('добавя toast в #notifications контейнера', () => {
        showToast('Тестово съобщение');
        const container = getContainer();
        expect(container.children.length).toBe(1);
    });

    it('toast-ът съдържа правилния текст', () => {
        const toast = showToast('Здравей свят');
        expect(toast.textContent).toBe('Здравей свят');
    });

    it('използва textContent (не innerHTML) — XSS безопасност', () => {
        const xssMessage = '<script>alert("xss")</script>';
        const toast = showToast(xssMessage);
        // Тагът трябва да е escaped, не изпълнен
        expect(toast.querySelector('script')).toBeNull();
        expect(toast.textContent).toBe(xssMessage);
    });

    it('toast-ът има базовия клас "toast"', () => {
        const toast = showToast('Съобщение');
        expect(toast.classList.contains('toast')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// notification — типове
// ---------------------------------------------------------------------------

describe('showToast — типове (CSS класове)', () => {
    beforeEach(() => {
        setupContainer();
    });

    afterEach(() => {
        removeContainer();
    });

    it('тип "success" → клас "toast-success"', () => {
        const toast = showToast('Успех', 'success');
        expect(toast.classList.contains('toast-success')).toBe(true);
    });

    it('тип "error" → клас "toast-error"', () => {
        const toast = showToast('Грешка', 'error');
        expect(toast.classList.contains('toast-error')).toBe(true);
    });

    it('тип "info" → клас "toast-info"', () => {
        const toast = showToast('Информация', 'info');
        expect(toast.classList.contains('toast-info')).toBe(true);
    });

    it('тип по подразбиране е "info"', () => {
        const toast = showToast('Съобщение');
        expect(toast.classList.contains('toast-info')).toBe(true);
    });

    it('toast с тип "success" няма клас "toast-error"', () => {
        const toast = showToast('Успех', 'success');
        expect(toast.classList.contains('toast-error')).toBe(false);
        expect(toast.classList.contains('toast-info')).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// notification — автоматично премахване
// ---------------------------------------------------------------------------

describe('showToast — автоматично премахване', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        setupContainer();
    });

    afterEach(() => {
        vi.useRealTimers();
        removeContainer();
    });

    it('toast-ът е в DOM веднага след добавяне', () => {
        const toast = showToast('Съобщение');
        expect(toast.parentNode).not.toBeNull();
    });

    it('toast-ът се премахва след 4000ms', () => {
        const toast = showToast('Съобщение');
        expect(toast.parentNode).not.toBeNull();
        vi.advanceTimersByTime(4000);
        expect(toast.parentNode).toBeNull();
    });

    it('toast-ът НЕ се премахва преди 4000ms', () => {
        const toast = showToast('Съобщение');
        vi.advanceTimersByTime(3999);
        expect(toast.parentNode).not.toBeNull();
    });

    it('защитно премахване: не хвърля грешка ако вече е премахнат от DOM', () => {
        const toast = showToast('Съобщение');
        // Премахваме ръчно преди timeout-а
        toast.remove();
        // Не трябва да хвърля грешка
        expect(() => vi.advanceTimersByTime(4000)).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// notification — липсващ контейнер
// ---------------------------------------------------------------------------

describe('showToast — липсващ #notifications контейнер', () => {
    beforeEach(() => {
        removeContainer();
    });

    it('не хвърля грешка при липсващ контейнер', () => {
        expect(() => showToast('Съобщение')).not.toThrow();
    });

    it('връща null при липсващ контейнер', () => {
        const result = showToast('Съобщение');
        expect(result).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// notification — множество toast-ове
// ---------------------------------------------------------------------------

describe('showToast — множество известия', () => {
    beforeEach(() => {
        setupContainer();
    });

    afterEach(() => {
        removeContainer();
    });

    it('може да добавя множество toast-ове', () => {
        showToast('Първо');
        showToast('Второ');
        showToast('Трето');
        const container = getContainer();
        expect(container.children.length).toBe(3);
    });

    it('всеки toast е независим елемент', () => {
        const t1 = showToast('Първо', 'success');
        const t2 = showToast('Второ', 'error');
        expect(t1).not.toBe(t2);
    });
});
