// Помощна функция за създаване на фиктивен JWT токен за тестове

/**
 * Създава валиден base64-кодиран JWT string за тестове.
 * Токенът не е криптографски подписан, но има правилна структура.
 *
 * @param {object} payload - JWT payload (напр. { exp: Date.now()/1000 + 3600 })
 * @returns {string} - JWT string във формат header.payload.signature
 */
export function createFakeJWT(payload) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    const signature = 'fake-signature';
    return `${header}.${body}.${signature}`;
}
