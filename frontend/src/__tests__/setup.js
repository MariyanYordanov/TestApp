// Глобална настройка за тестовата среда

// Добавяме необходимите DOM елементи в document.body
document.body.innerHTML = `
    <main id="main"></main>
    <nav id="sidebar"></nav>
`;

afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});
