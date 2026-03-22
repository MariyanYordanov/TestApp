// Тестове за views/participant/testEntryView.js

const page = (await import('../../../lib/page.min.js')).default;
const { showTestEntry } = await import('../../../views/participant/testEntryView.js');

// Изчаква завършването на всички pending Promise микрозадачи
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

describe('testEntryView.js — невалиден shareCode', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        sessionStorage.clear();
        await showTestEntry({ params: { shareCode: 'NOTEXIST' } });
        await flushPromises();
    });

    it('показва error съобщение', () => {
        const main = document.getElementById('main');
        const errorEl = main.querySelector('.error-card') ?? main.querySelector('[class*="error"]');
        expect(errorEl).not.toBeNull();
    });

    it('не рендира форма за вход', () => {
        const main = document.getElementById('main');
        expect(main.querySelector('form')).toBeNull();
    });

    it('показва link "Назад"', () => {
        const main = document.getElementById('main');
        const backLink = main.querySelector('a[href="/"]');
        expect(backLink).not.toBeNull();
    });
});

describe('testEntryView.js — валиден shareCode', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        sessionStorage.clear();
        await showTestEntry({ params: { shareCode: 'ABCD1234' } });
        await flushPromises();
    });

    it('рендира поле за въвеждане на име', () => {
        const main = document.getElementById('main');
        expect(main.querySelector('#participant-name')).not.toBeNull();
    });

    it('рендира бутон "Започни теста"', () => {
        const main = document.getElementById('main');
        const btn = main.querySelector('button[type="submit"], button[data-action="start-test"]');
        expect(btn).not.toBeNull();
    });

    it('показва заглавието на теста', () => {
        const main = document.getElementById('main');
        expect(main.textContent).toContain('Тест по JavaScript');
    });

    it('показва броя въпроси', () => {
        const main = document.getElementById('main');
        expect(main.textContent).toContain('3');
    });

    it('показва форматираното времетраене', () => {
        const main = document.getElementById('main');
        // 1800 секунди = 30:00
        expect(main.textContent).toContain('30:00');
    });

    it('main.className е "centered"', () => {
        const main = document.getElementById('main');
        expect(main.className).toBe('centered');
    });
});

describe('testEntryView.js — валидация на форма', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        sessionStorage.clear();
        await showTestEntry({ params: { shareCode: 'ABCD1234' } });
        await flushPromises();
    });

    it('показва грешка при празно name', async () => {
        const main = document.getElementById('main');
        const form = main.querySelector('form');
        const nameInput = main.querySelector('#participant-name');
        nameInput.value = '';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();
        const errorEl = main.querySelector('.field-error') ?? main.querySelector('[class*="error"]');
        expect(errorEl).not.toBeNull();
        expect(page.redirect).not.toHaveBeenCalled();
    });

    it('показва грешка при name с 1 символ', async () => {
        const main = document.getElementById('main');
        const form = main.querySelector('form');
        const nameInput = main.querySelector('#participant-name');
        nameInput.value = 'А';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();
        const errorEl = main.querySelector('.field-error') ?? main.querySelector('[class*="error"]');
        expect(errorEl).not.toBeNull();
        expect(page.redirect).not.toHaveBeenCalled();
    });

    it('показва грешка при name само с интервали (whitespace)', async () => {
        const main = document.getElementById('main');
        const form = main.querySelector('form');
        const nameInput = main.querySelector('#participant-name');
        nameInput.value = '   ';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();
        const errorEl = main.querySelector('.field-error') ?? main.querySelector('[class*="error"]');
        expect(errorEl).not.toBeNull();
        expect(page.redirect).not.toHaveBeenCalled();
    });

    it('показва грешка при name над 100 символа', async () => {
        const main = document.getElementById('main');
        const form = main.querySelector('form');
        const nameInput = main.querySelector('#participant-name');
        nameInput.value = 'А'.repeat(101);
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();
        const errorEl = main.querySelector('.field-error') ?? main.querySelector('[class*="error"]');
        expect(errorEl).not.toBeNull();
        expect(page.redirect).not.toHaveBeenCalled();
    });
});

describe('testEntryView.js — успешен submit', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        page.redirect.mockReset();
        sessionStorage.clear();
        await showTestEntry({ params: { shareCode: 'ABCD1234' } });
        await flushPromises();
    });

    it('запазва name в sessionStorage при валиден submit', async () => {
        const main = document.getElementById('main');
        const form = main.querySelector('form');
        const nameInput = main.querySelector('#participant-name');
        nameInput.value = 'Иван Иванов';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();
        expect(sessionStorage.getItem('testapp_participant_ABCD1234')).toBe('Иван Иванов');
    });

    it('trimва name преди записване в sessionStorage', async () => {
        const main = document.getElementById('main');
        const form = main.querySelector('form');
        const nameInput = main.querySelector('#participant-name');
        nameInput.value = '  Иван  ';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();
        expect(sessionStorage.getItem('testapp_participant_ABCD1234')).toBe('Иван');
    });

    it('извиква page.redirect с URL, съдържащ shareCode', async () => {
        const main = document.getElementById('main');
        const form = main.querySelector('form');
        const nameInput = main.querySelector('#participant-name');
        nameInput.value = 'Мария';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushPromises();
        expect(page.redirect).toHaveBeenCalledTimes(1);
        const redirectUrl = page.redirect.mock.calls[0][0];
        expect(redirectUrl).toContain('ABCD1234');
        expect(redirectUrl).toContain('/test/');
        expect(redirectUrl).toContain('/take/');
    });
});
