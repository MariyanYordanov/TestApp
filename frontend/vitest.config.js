import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/__tests__/setup.js',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
            include: ['src/**/*.js'],
            exclude: ['src/__tests__/**', 'lib/**'],
        },
    },
    resolve: {
        alias: {
            '../../lib/page.min.js': '/Users/marsteyor/Desktop/TestApp/frontend/src/__tests__/__mocks__/page.js',
            '../../../lib/page.min.js': '/Users/marsteyor/Desktop/TestApp/frontend/src/__tests__/__mocks__/page.js',
        },
    },
});
