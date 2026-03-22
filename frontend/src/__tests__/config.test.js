// Тестове за config.js

import { API_BASE_URL } from '../config.js';

describe('config.js', () => {
    it('API_BASE_URL трябва да е коректен URL към localhost', () => {
        expect(API_BASE_URL).toBe('http://localhost:5000/api');
    });

    it('API_BASE_URL е string', () => {
        expect(typeof API_BASE_URL).toBe('string');
    });

    it('API_BASE_URL не е празен низ', () => {
        expect(API_BASE_URL.length).toBeGreaterThan(0);
    });

    it('API_BASE_URL започва с http', () => {
        expect(API_BASE_URL).toMatch(/^https?:\/\//);
    });
});
