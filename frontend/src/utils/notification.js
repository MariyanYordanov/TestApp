// Стъпка 54 — notification.js
// Система за toast известия.
//
// Функционалност:
//   - Показва toast съобщения в #notifications контейнера
//   - Поддържа три типа: success, error, info
//   - Автоматично премахване след 4000ms
//   - XSS-безопасно: използва textContent, не innerHTML

// Картографиране на тип към CSS клас
const TYPE_CLASS_MAP = {
    success: 'toast-success',
    error: 'toast-error',
    info: 'toast-info',
};

/**
 * Показва toast известие.
 *
 * @param {string} message - Текстът на съобщението
 * @param {'success'|'error'|'info'} type - Типът на съобщението (по подразбиране 'info')
 * @returns {HTMLElement|null} Създаденият toast елемент, или null ако контейнерът липсва
 */
export function showToast(message, type = 'info') {
    const container = document.getElementById('notifications');

    if (!container) {
        // Не хвърляме грешка — просто логваме предупреждение
        console.warn('showToast: #notifications контейнерът не е намерен в DOM.');
        return null;
    }

    // Създаваме toast елемент с правилните CSS класове
    const toast = document.createElement('div');
    toast.className = `toast ${TYPE_CLASS_MAP[type] ?? TYPE_CLASS_MAP.info}`;

    // XSS-безопасно — използваме textContent, не innerHTML
    toast.textContent = message;

    container.appendChild(toast);

    // Автоматично премахване след 4000ms
    // Defensive: проверяваме дали toast-ът все още е в DOM преди премахване
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 4000);

    return toast;
}
