# TestApp — Платформа за прозрачно провеждане на тестове

##### Контекст и визия

Приложение за учители и ученици, което позволява прозрачно и открито провеждане на изпитвания. Учителят създава тестове с различни типове въпроси, организира ги по категории, споделя линк на учениците (които НЕ е нужно да се регистрират) и следи резултатите в реално време.

**Технологичен стек:**
- Frontend: HTML, CSS, Vanilla JavaScript (SPA), page.js (routing), навигация
- Backend: ASP.NET Core Web API (C#)
- Database: PostgreSQL
- Архитектура: REST API + SPA клиент, JWT автентикация

---

## КРИТИЧЕН АНАЛИЗ НА ОРИГИНАЛНАТА ИДЕЯ

### Какво е добре замислено
1. **Ясно разделение на роли** — учител (регистриран) vs ученик (нерегистриран, получава линк). Това е ключово предимство за adoption — учениците нямат нужда от акаунт.
2. **Anti-cheat механизъм** — идеята за автоматично затваряне при напускане на таба е практична и лесна за имплементация с `visibilitychange` API.
3. **Категоризация на тестовете** — All Categories / My Categories е добро UX решение за организация.
4. **Статистика с конкретни колони** — Test Title, UserName, Score, End Date & Time покриват основните нужди.
5. **Preview Test** — възможността учителят да прегледа теста преди публикуване е правилна.

### Какво трябва да се подобри

#### 1. Data model — КРИТИЧНИ проблеми
- **Category.Type (open, closed, multi) е на грешно ниво.** Типът на отговора е свойство на ВЪПРОСА, не на категорията. Една категория "Математика" може да съдържа и отворени, и затворени въпроси. **Решение:** Преместваме `QuestionType` в `Question`.
- **Category няма нужда от поле Start.** Стартирането е свойство на теста (кога е достъпен), не на категорията. **Решение:** Добавяме `StartDate` и `EndDate` в `Test`.
- **Липсва връзка Category → Test.** В оригинала е 1:N, но в практиката един тест може да принадлежи на няколко категории (напр. "Математика и Логика"). **Решение:** Many-to-Many чрез join таблица `TestCategories`.
- **Participant.ParentId като string е неясно.** Трябва да е FK към теста. **Решение:** Ясна връзка `Participant → Test`, `Participant → TestAttempt`.
- **Липсва `TestAttempt` entity.** Един участник може да реши теста многократно (ако е позволено). Нужна е отделна таблица за всеки опит, която пази score, начално/крайно време, статус. Без нея статистиката е невъзможна.
- **Липсва `UserAnswer` entity.** За прозрачност трябва да знаем какво точно е отговорил всеки участник на всеки въпрос.
- **Answer.IsCorrect е достатъчно за closed/multi**, но за open-ended въпроси трябва друг механизъм (ръчна проверка от учител или pattern matching).

#### 2. Сигурност
- **Споделеният линк не трябва да бъде предвидим.** Не ползвай sequential ID в URL-а (`/test/42`). Ползвай UUID или кратък хеш (`/test/a7f3b2c9`).
- **JWT токенът за учителя** трябва да има refresh механизъм. Оригиналните бележки показват само `getToken()` без expiration handling.
- **Rate limiting** за API-то — без него ученик може да спами submit-и.
- **Participant validation** — как знаеш кой е ученикът, ако не е регистриран? Трябва поне име + клас/група преди да започне теста.

#### 3. UX проблеми
- **Стъпковият процес Create → Add Category → Add Questions е линеен и бавен.** По-добре: една страница с wizard (stepper), където всичко е на едно място, с tabove или accordion.
- **Липсва bulk import на въпроси** — учителите имат стотици въпроси в Word/Excel файлове.
- **Липсва timer за теста** — основен feature за изпити (30 мин, 60 мин и т.н.).
- **Липсва randomization** — разбъркване на въпроси и отговори за да не преписват.
- **Липсва scoring configuration** — различни точки за различни въпроси, отрицателни точки за грешни отговори.
- **Липсва "draft" статус** — учителят трябва да може да запази незавършен тест.

#### 4. Real-time следене
- Оригиналните бележки споменават "следи в реално време", но няма архитектура за това. **Решение:** SignalR hub за live updates — кога ученик започва, на кой въпрос е, кога завършва, anti-cheat alerts.

---

## ПОДОБРЕН DATA MODEL

```
┌──────────────────────────────────────────────────────────────────┐
│ USERS (ASP.NET Identity)                                         │
│ Id (GUID, PK), Email, PasswordHash, FullName, Role (Teacher)    │
└──────────────────────────────────────────────────────────────────┘
         │ 1:N
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ TESTS                                                            │
│ Id (GUID, PK), Title, Description, CreatorId (FK→Users),        │
│ ShareCode (unique, 8-char hash), Status (Draft/Published/       │
│ Archived), TimeLimitMinutes (nullable), ShuffleQuestions (bool), │
│ ShuffleAnswers (bool), AllowMultipleAttempts (bool),             │
│ ShowResultsToStudent (bool), StartDate, EndDate,                 │
│ CreatedAt, UpdatedAt                                             │
└──────────────────────────────────────────────────────────────────┘
         │ M:N                          │ 1:N
         ▼                              ▼
┌────────────────────┐    ┌──────────────────────────────────────┐
│ TEST_CATEGORIES    │    │ QUESTIONS                             │
│ TestId (FK)        │    │ Id (GUID, PK), TestId (FK→Tests),   │
│ CategoryId (FK)    │    │ Text, Type (Closed/Open/Multi),      │
│ (composite PK)     │    │ Points (int, default 1),             │
│                    │    │ OrderIndex (int), Hint (nullable)    │
└────────────────────┘    └──────────────────────────────────────┘
         │ N:1                          │ 1:N
         ▼                              ▼
┌────────────────────┐    ┌──────────────────────────────────────┐
│ CATEGORIES         │    │ ANSWERS                               │
│ Id (GUID, PK),     │    │ Id (GUID, PK), QuestionId (FK),     │
│ Name, Description, │    │ Text, IsCorrect (bool),              │
│ CreatorId (FK),    │    │ OrderIndex (int)                      │
│ IsPublic (bool)    │    └──────────────────────────────────────┘
└────────────────────┘
                           ┌──────────────────────────────────────┐
                           │ TEST_ATTEMPTS                         │
                           │ Id (GUID, PK), TestId (FK→Tests),   │
                           │ ParticipantName (string),             │
                           │ ParticipantGroup (string, nullable), │
                           │ StartedAt, FinishedAt (nullable),    │
                           │ Score (int, nullable),                │
                           │ MaxScore (int),                       │
                           │ Status (InProgress/Completed/         │
                           │   TimedOut/Terminated),               │
                           │ TerminationReason (nullable),         │
                           │ IpAddress, UserAgent                  │
                           └──────────────────────────────────────┘
                                        │ 1:N
                                        ▼
                           ┌──────────────────────────────────────┐
                           │ USER_ANSWERS                          │
                           │ Id (GUID, PK),                        │
                           │ AttemptId (FK→TestAttempts),          │
                           │ QuestionId (FK→Questions),            │
                           │ SelectedAnswerId (FK, nullable),     │
                           │ OpenText (string, nullable),         │
                           │ IsCorrect (bool, nullable),          │
                           │ AnsweredAt (timestamp)                │
                           └──────────────────────────────────────┘
```

---

## FRONTEND АРХИТЕКТУРА (SPA с page.js)

### Файлова структура

```
frontend/
├── index.html                    # Единствен HTML файл (SPA shell)
├── css/
│   ├── main.css                  # Основни стилове, CSS custom properties
│   ├── components.css            # Бутони, карти, форми, модали
│   ├── layout.css                # Sidebar, header, grid система
│   └── test-taking.css           # Стилове за решаване на тест (ученик)
├── src/
│   ├── app.js                    # Entry point: init, DOMContentLoaded
│   ├── config.js                 # API_BASE_URL, константи
│   ├── router/
│   │   └── routes.js             # page.js route дефиниции
│   ├── services/
│   │   ├── api.js                # fetch wrapper (GET, POST, PUT, DELETE)
│   │   ├── auth.js               # login, register, getToken, logout, isAuthenticated
│   │   └── realtime.js           # SignalR client (за real-time updates)
│   ├── utils/
│   │   ├── render.js             # render(template, container) helper
│   │   ├── nav.js                # Sidebar навигация, active state
│   │   ├── notifications.js      # Toast notifications
│   │   └── validators.js         # Form validation helpers
│   ├── views/
│   │   ├── homeView.js           # Landing page (public)
│   │   ├── loginView.js          # Login форма
│   │   ├── registerView.js       # Register форма
│   │   ├── dashboardView.js      # My Tests списък с карти
│   │   ├── createTestView.js     # Wizard: Create/Edit test
│   │   ├── testDetailsView.js    # Test details + participants + stats
│   │   ├── categoriesView.js     # Manage categories
│   │   ├── statisticsView.js     # Global statistics overview
│   │   ├── accountView.js        # Profile settings
│   │   ├── helpView.js           # Help / documentation
│   │   └── participant/
│   │       ├── testEntryView.js  # Participant enters name → starts test
│   │       └── testTakingView.js # The actual test-solving experience
│   └── templates/
│       ├── navTemplate.js        # Sidebar HTML template
│       ├── testCardTemplate.js   # Test card за dashboard
│       ├── questionTemplate.js   # Question rendering (by type)
│       └── statsTableTemplate.js # Statistics table rows
└── lib/
    └── page.min.js               # page.js router library
```

### Стъпка по стъпка имплементация

#### ФАЗА 1: Скелет (Стъпки 1-3 от бележките)

**Стъпка 1 — Проектна структура и index.html**

Създай `index.html` с:
- `<nav id="sidebar">` за странична навигация
- `<main id="main">` за динамично съдържание
- `<script type="module" src="./src/app.js">` за ES modules
- Линкове към CSS файловете

**Стъпка 2 — app.js и routing**

```javascript
// src/app.js
import page from '../lib/page.min.js';
import { setupNav } from './utils/nav.js';
import { initRoutes } from './router/routes.js';

export function init() {
    setupNav();
    initRoutes();
    page.start();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
```

**Стъпка 3 — routes.js**

```javascript
// src/router/routes.js
import page from '../../lib/page.min.js';
import { showHome } from '../views/homeView.js';
import { showLogin } from '../views/loginView.js';
import { showRegister } from '../views/registerView.js';
import { showDashboard } from '../views/dashboardView.js';
import { showCreateTest } from '../views/createTestView.js';
import { showTestDetails } from '../views/testDetailsView.js';
import { showCategories } from '../views/categoriesView.js';
import { showStatistics } from '../views/statisticsView.js';
import { showAccount } from '../views/accountView.js';
import { showTestEntry } from '../views/participant/testEntryView.js';
import { showTestTaking } from '../views/participant/testTakingView.js';
import { isAuthenticated } from '../services/auth.js';

function authGuard(ctx, next) {
    if (!isAuthenticated()) {
        page.redirect('/login');
        return;
    }
    next();
}

export function initRoutes() {
    // Public routes
    page('/', showHome);
    page('/login', showLogin);
    page('/register', showRegister);

    // Participant routes (no auth needed, uses shareCode)
    page('/test/:shareCode', showTestEntry);
    page('/test/:shareCode/take/:attemptId', showTestTaking);

    // Teacher routes (auth required)
    page('/dashboard', authGuard, showDashboard);
    page('/tests/create', authGuard, showCreateTest);
    page('/tests/:id/edit', authGuard, showCreateTest);  // Same view, edit mode
    page('/tests/:id', authGuard, showTestDetails);
    page('/categories', authGuard, showCategories);
    page('/statistics', authGuard, showStatistics);
    page('/account', authGuard, showAccount);

    // 404
    page('*', () => {
        document.getElementById('main').innerHTML = '<h1>404 — Страницата не е намерена</h1>';
    });
}
```

#### ФАЗА 2: API слой и автентикация (Стъпки 4-6 от бележките)

**Стъпка 4 — config.js**

```javascript
export const API_BASE_URL = 'http://localhost:5000/api';
```

**Стъпка 5 — api.js (fetch wrapper)**

```javascript
// src/services/api.js
import { API_BASE_URL } from '../config.js';
import { getToken } from './auth.js';

async function request(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(API_BASE_URL + url, { ...options, headers });

    if (response.status === 401) {
        // Token expired — redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        page.redirect('/login');
        throw new Error('Unauthorized');
    }
    if (response.status === 404) return null;
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) return null;
    return response.json();
}

export const api = {
    get: (url) => request(url, { method: 'GET' }),
    post: (url, data) => request(url, { method: 'POST', body: JSON.stringify(data) }),
    put: (url, data) => request(url, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (url) => request(url, { method: 'DELETE' }),
};
```

**Стъпка 6 — auth.js**

```javascript
// src/services/auth.js
import { api } from './api.js';

export function getToken() {
    return localStorage.getItem('token');
}

export function getUser() {
    const data = localStorage.getItem('user');
    return data ? JSON.parse(data) : null;
}

export function isAuthenticated() {
    const token = getToken();
    if (!token) return false;
    // Basic JWT expiration check
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 > Date.now();
    } catch {
        return false;
    }
}

export async function login(email, password) {
    if (!email || !password) {
        throw new Error('Моля въведете email и парола');
    }
    const result = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', result.token);
    localStorage.setItem('user', JSON.stringify(result.user));
    return result;
}

export async function register(email, password, fullName) {
    if (!email || !password || !fullName) {
        throw new Error('Всички полета са задължителни');
    }
    const result = await api.post('/auth/register', { email, password, fullName });
    localStorage.setItem('token', result.token);
    localStorage.setItem('user', JSON.stringify(result.user));
    return result;
}

export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}
```

#### ФАЗА 3: Views и Templates (Стъпки 7-10 от бележките)

**Стъпка 7 — render.js helper**

```javascript
// src/utils/render.js
export function render(templateFn, container, ...args) {
    if (typeof container === 'string') {
        container = document.querySelector(container);
    }
    container.innerHTML = templateFn(...args);
}
```

**Стъпка 8 — nav.js**

```javascript
// src/utils/nav.js
import { isAuthenticated, logout, getUser } from '../services/auth.js';
import page from '../../lib/page.min.js';

const navItems = [
    { path: '/dashboard', label: 'Моите тестове', icon: '📝', auth: true },
    { path: '/categories', label: 'Категории', icon: '📂', auth: true },
    { path: '/statistics', label: 'Статистика', icon: '📊', auth: true },
    { path: '/account', label: 'Акаунт', icon: '👤', auth: true },
];

export function setupNav() {
    updateNav();
    // Re-render nav on route change
    page('*', (ctx, next) => {
        updateNav(ctx.path);
        next();
    });
}

function updateNav(currentPath = '/') {
    const sidebar = document.getElementById('sidebar');
    const auth = isAuthenticated();
    const user = getUser();

    if (!auth) {
        sidebar.innerHTML = '';
        sidebar.style.display = 'none';
        return;
    }

    sidebar.style.display = 'flex';
    sidebar.innerHTML = `
        <div class="nav-header">
            <h2>TestApp</h2>
            <p class="nav-user">${user?.fullName || ''}</p>
        </div>
        <ul class="nav-list">
            ${navItems.filter(i => !i.auth || auth).map(item => `
                <li class="nav-item ${currentPath === item.path ? 'active' : ''}">
                    <a href="${item.path}" data-nav>
                        <span class="nav-icon">${item.icon}</span>
                        ${item.label}
                    </a>
                </li>
            `).join('')}
        </ul>
        <div class="nav-footer">
            <button id="btn-logout" class="btn-logout">Изход</button>
        </div>
    `;

    document.getElementById('btn-logout')?.addEventListener('click', () => {
        logout();
        page.redirect('/');
    });
}
```

**Стъпка 9 — dashboardView.js (пример за view)**

```javascript
// src/views/dashboardView.js
import { api } from '../services/api.js';
import { render } from '../utils/render.js';
import { testCardTemplate } from '../templates/testCardTemplate.js';

const dashboardTemplate = (tests) => `
    <div class="dashboard">
        <div class="dashboard-header">
            <h1>Моите тестове</h1>
            <a href="/tests/create" class="btn btn-primary">+ Нов тест</a>
        </div>
        <div class="test-filters">
            <button class="filter-btn active" data-filter="all">Всички</button>
            <button class="filter-btn" data-filter="draft">Чернови</button>
            <button class="filter-btn" data-filter="published">Публикувани</button>
            <button class="filter-btn" data-filter="archived">Архивирани</button>
        </div>
        <div class="test-grid" id="test-grid">
            ${tests.length > 0
                ? tests.map(t => testCardTemplate(t)).join('')
                : '<p class="empty-state">Нямате създадени тестове все още.</p>'
            }
        </div>
    </div>
`;

export async function showDashboard() {
    const main = document.getElementById('main');
    main.innerHTML = '<p class="loading">Зареждане...</p>';

    try {
        const tests = await api.get('/tests');
        render(dashboardTemplate, main, tests || []);
        setupFilters();
    } catch (error) {
        main.innerHTML = `<p class="error">Грешка: ${error.message}</p>`;
    }
}

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const filter = e.target.dataset.filter;
            document.querySelectorAll('.test-card').forEach(card => {
                card.style.display = (filter === 'all' || card.dataset.status === filter) ? '' : 'none';
            });
        });
    });
}
```

**Стъпка 10 — testTakingView.js (ученик решава теста)**

Този view е най-критичният — тук живее anti-cheat механизмът:

```javascript
// src/views/participant/testTakingView.js
import { api } from '../../services/api.js';
import page from '../../../lib/page.min.js';

let antiCheatHandler = null;
let timerInterval = null;

export async function showTestTaking(ctx) {
    const { shareCode, attemptId } = ctx.params;
    const main = document.getElementById('main');

    try {
        const data = await api.get(`/tests/${shareCode}/attempt/${attemptId}`);
        renderTest(data, main, shareCode, attemptId);
        setupAntiCheat(shareCode, attemptId);
        if (data.timeLimitMinutes) {
            startTimer(data.timeLimitMinutes, data.startedAt, shareCode, attemptId);
        }
    } catch (error) {
        main.innerHTML = `<p class="error">${error.message}</p>`;
    }
}

function setupAntiCheat(shareCode, attemptId) {
    // Cleanup previous handler if exists
    if (antiCheatHandler) {
        document.removeEventListener('visibilitychange', antiCheatHandler);
    }

    let warnings = 0;
    const MAX_WARNINGS = 2;  // Give 2 warnings before terminating

    antiCheatHandler = async () => {
        if (document.hidden) {
            warnings++;
            if (warnings > MAX_WARNINGS) {
                // Terminate the test
                await api.post(`/tests/${shareCode}/attempt/${attemptId}/terminate`, {
                    reason: 'Напускане на прозореца на теста'
                });
                cleanup();
                page.redirect(`/test/${shareCode}?terminated=true`);
            } else {
                // Show warning
                showWarning(`Внимание! Напуснахте теста. Оставащи предупреждения: ${MAX_WARNINGS - warnings}`);
            }
        }
    };

    document.addEventListener('visibilitychange', antiCheatHandler);
}

function startTimer(limitMinutes, startedAt, shareCode, attemptId) {
    const endTime = new Date(startedAt).getTime() + limitMinutes * 60 * 1000;
    const timerEl = document.getElementById('timer');

    timerInterval = setInterval(async () => {
        const remaining = endTime - Date.now();
        if (remaining <= 0) {
            clearInterval(timerInterval);
            await api.post(`/tests/${shareCode}/attempt/${attemptId}/terminate`, {
                reason: 'Изтекло време'
            });
            cleanup();
            page.redirect(`/test/${shareCode}?timeout=true`);
            return;
        }
        const min = Math.floor(remaining / 60000);
        const sec = Math.floor((remaining % 60000) / 1000);
        timerEl.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
        if (remaining < 60000) timerEl.classList.add('timer-warning');
    }, 1000);
}

function cleanup() {
    if (antiCheatHandler) {
        document.removeEventListener('visibilitychange', antiCheatHandler);
        antiCheatHandler = null;
    }
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}
```

---

## BACKEND API АРХИТЕКТУРА (ASP.NET Core)

### Проектна структура

```
TestApp.API/
├── Program.cs
├── appsettings.json
├── Controllers/
│   ├── AuthController.cs         # POST /api/auth/login, /register
│   ├── TestsController.cs        # CRUD за тестове
│   ├── CategoriesController.cs   # CRUD за категории
│   ├── QuestionsController.cs    # CRUD за въпроси (nested under tests)
│   ├── AttemptsController.cs     # Participant test-taking endpoints
│   └── StatisticsController.cs   # Aggregated stats
├── Models/
│   ├── Entities/                 # EF Core entity classes
│   │   ├── User.cs
│   │   ├── Test.cs
│   │   ├── Category.cs
│   │   ├── TestCategory.cs
│   │   ├── Question.cs
│   │   ├── Answer.cs
│   │   ├── TestAttempt.cs
│   │   └── UserAnswer.cs
│   ├── DTOs/                     # Data transfer objects
│   │   ├── Auth/
│   │   ├── Tests/
│   │   ├── Questions/
│   │   └── Statistics/
│   └── Enums/
│       ├── TestStatus.cs         # Draft, Published, Archived
│       ├── QuestionType.cs       # Closed, Open, MultiChoice
│       └── AttemptStatus.cs      # InProgress, Completed, TimedOut, Terminated
├── Data/
│   ├── AppDbContext.cs           # EF Core DbContext
│   └── Migrations/
├── Services/
│   ├── ITestService.cs
│   ├── TestService.cs
│   ├── IAuthService.cs
│   ├── AuthService.cs
│   ├── IStatisticsService.cs
│   └── StatisticsService.cs
├── Hubs/
│   └── TestMonitorHub.cs         # SignalR за real-time
└── Middleware/
    └── ExceptionMiddleware.cs
```

### API Endpoints

```
AUTH:
  POST   /api/auth/register          { email, password, fullName }
  POST   /api/auth/login             { email, password }

TESTS (учител, изисква JWT):
  GET    /api/tests                   Списък на тестовете на учителя
  GET    /api/tests/:id               Детайли на тест (с въпроси)
  POST   /api/tests                   Създай нов тест
  PUT    /api/tests/:id               Редактирай тест
  DELETE /api/tests/:id               Изтрий тест
  POST   /api/tests/:id/publish       Публикувай (Draft → Published)
  POST   /api/tests/:id/archive       Архивирай

QUESTIONS (nested, учител):
  GET    /api/tests/:testId/questions
  POST   /api/tests/:testId/questions           { text, type, points, answers[] }
  PUT    /api/tests/:testId/questions/:qId
  DELETE /api/tests/:testId/questions/:qId
  PUT    /api/tests/:testId/questions/reorder    [{ id, orderIndex }]

CATEGORIES (учител):
  GET    /api/categories               Всички + моите
  POST   /api/categories               Нова категория
  PUT    /api/categories/:id
  DELETE /api/categories/:id

PARTICIPANT (без JWT, по shareCode):
  GET    /api/tests/:shareCode/info            Публична инфо за теста
  POST   /api/tests/:shareCode/start           { participantName, group }  → attemptId
  GET    /api/tests/:shareCode/attempt/:aId    Въпроси за решаване
  POST   /api/tests/:shareCode/attempt/:aId/answer   { questionId, answerId/openText }
  POST   /api/tests/:shareCode/attempt/:aId/submit   Приключи теста
  POST   /api/tests/:shareCode/attempt/:aId/terminate { reason }

STATISTICS (учител):
  GET    /api/tests/:id/statistics     Резултати за конкретен тест
  GET    /api/statistics/overview      Обобщена статистика
```

---

## POSTGRESQL SETUP

### Инструменти, които ще ти трябват

1. **pgAdmin 4** — графичен UI за PostgreSQL (най-популярният, безплатен). Инсталира се отделно или идва с PostgreSQL installer.
2. **DBeaver** — универсален database client (поддържа PostgreSQL, MySQL, SQLite и др.). Безплатен, cross-platform. Добра алтернатива на pgAdmin.
3. **psql** — command-line tool, идва с PostgreSQL. За бързи заявки.
4. **DataGrip** (от JetBrains) — платен, но най-мощният IDE за бази данни. Безплатен с .edu лиценз.

### Connection string (appsettings.json)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=testapp;Username=postgres;Password=YOUR_PASSWORD"
  }
}
```

### EF Core миграция (първа стъпка)

```bash
# В директорията на API проекта:
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add package Microsoft.EntityFrameworkCore.Design

# Създай миграция:
dotnet ef migrations add InitialCreate

# Приложи миграцията (създава таблиците):
dotnet ef database update
```

### SQL схема (ако предпочиташ ръчно)

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE test_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE question_type AS ENUM ('closed', 'open', 'multi');
CREATE TYPE attempt_status AS ENUM ('in_progress', 'completed', 'timed_out', 'terminated');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    share_code VARCHAR(8) UNIQUE NOT NULL,
    status test_status DEFAULT 'draft',
    time_limit_minutes INT,
    shuffle_questions BOOLEAN DEFAULT false,
    shuffle_answers BOOLEAN DEFAULT false,
    allow_multiple_attempts BOOLEAN DEFAULT false,
    show_results_to_student BOOLEAN DEFAULT true,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE test_categories (
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (test_id, category_id)
);

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type question_type NOT NULL,
    points INT DEFAULT 1,
    order_index INT NOT NULL,
    hint TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    order_index INT NOT NULL
);

CREATE TABLE test_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    participant_name VARCHAR(255) NOT NULL,
    participant_group VARCHAR(100),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    score INT,
    max_score INT,
    status attempt_status DEFAULT 'in_progress',
    termination_reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE TABLE user_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID REFERENCES test_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    selected_answer_id UUID REFERENCES answers(id),
    open_text TEXT,
    is_correct BOOLEAN,
    answered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes за performance
CREATE INDEX idx_tests_creator ON tests(creator_id);
CREATE INDEX idx_tests_share_code ON tests(share_code);
CREATE INDEX idx_questions_test ON questions(test_id);
CREATE INDEX idx_answers_question ON answers(question_id);
CREATE INDEX idx_attempts_test ON test_attempts(test_id);
CREATE INDEX idx_user_answers_attempt ON user_answers(attempt_id);
```

---

## ПЛАН ЗА ИМПЛЕМЕНТАЦИЯ

### Ред на работа (frontend-first approach):

**Седмица 1: Frontend скелет**
1. Създай проектната структура (файлове, папки)
2. `index.html` + CSS layout (sidebar + main area)
3. `app.js` + `routes.js` с page.js
4. `nav.js` — работеща навигация
5. `homeView.js` — landing page

**Седмица 2: Auth + Dashboard**
6. `api.js` fetch wrapper
7. `auth.js` — login/register/logout
8. `loginView.js` и `registerView.js`
9. `dashboardView.js` — mock data first, after API later
10. `testCardTemplate.js`

**Седмица 3: Create/Edit Test wizard**
11. `createTestView.js` — stepper UI (Title → Categories → Questions → Preview)
12. `questionTemplate.js` — renders different question types
13. Form validation
14. Preview mode

**Седмица 4: Participant (ученик) flow**
15. `testEntryView.js` — вход по shareCode, въвеждане на име
16. `testTakingView.js` — решаване на теста
17. Anti-cheat (visibilitychange)
18. Timer
19. Submit + results screen

**Седмица 5: Backend API**
20. ASP.NET Core проект + EF Core + PostgreSQL
21. Auth endpoints (register, login, JWT)
22. Tests CRUD
23. Questions/Answers CRUD
24. Participant endpoints

**Седмица 6: Свързване + Statistics**
25. Свържи frontend с реалния API
26. Statistics view — таблица с резултати
27. Categories management
28. Real-time (SignalR) — опционално

**Седмица 7: Polish**
29. Error handling навсякъде
30. Loading states
31. Responsive design (tablet/phone — както е в wireframe-а)
32. Testing + bug fixes

---

## ВАЖНИ ИНСТРУКЦИИ ЗА CLAUDE CODE

- Започваме от FRONTEND. Не пипай backend докато не кажа.
- Използвай VANILLA JavaScript — НИКАКВИ frameworks (React, Vue, Angular). Само page.js за routing.
- ES Modules (`import`/`export`) навсякъде. Без CommonJS.
- CSS custom properties за теми и цветове. БЕЗ CSS frameworks (Bootstrap, Tailwind).
- Всяка view функция е `async` и получава `ctx` от page.js.
- Templates са template literal функции, връщащи HTML string.
- Файлове под 200 реда. Ако view стане по-голям — раздели на helper функции.
- Коментари на БЪЛГАРСКИ за бизнес логика, на английски за технически.
- Тестирай всеки route с `page('/path', handler)` преди да продължиш.
- API mock: Първо работи с hardcoded data в JS, после свържи с backend.
- Git commit на всяка завършена стъпка.
