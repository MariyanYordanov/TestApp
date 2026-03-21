-- ============================================================
-- Стъпка 1 — Пълна SQL схема на базата данни TestApp
-- Изпълни този файл веднъж за да създадеш всички таблици.
-- ============================================================

-- Разширение за генериране на UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM типове
-- ============================================================

CREATE TYPE test_status    AS ENUM ('draft', 'published', 'archived');
CREATE TYPE question_type  AS ENUM ('closed', 'open', 'multi');
CREATE TYPE attempt_status AS ENUM ('in_progress', 'completed', 'timed_out', 'terminated');

-- ============================================================
-- ТАБЛИЦА: users
-- Учителите, които се регистрират в системата.
-- ============================================================

CREATE TABLE users (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email        VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name    VARCHAR(255) NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ТАБЛИЦА: categories
-- Категории за организиране на тестовете.
-- Може да са публични (всички учители) или лични.
-- ============================================================

CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id  UUID REFERENCES users(id) ON DELETE CASCADE,
    is_public   BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ТАБЛИЦА: tests
-- Основната единица — тест създаден от учител.
-- share_code е 8-символен код, споделян с учениците.
-- ============================================================

CREATE TABLE tests (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title                   VARCHAR(500) NOT NULL,
    description             TEXT,
    creator_id              UUID REFERENCES users(id) ON DELETE CASCADE,
    share_code              VARCHAR(8) UNIQUE NOT NULL,
    status                  test_status DEFAULT 'draft',
    time_limit_minutes      INT,
    shuffle_questions        BOOLEAN DEFAULT false,
    shuffle_answers          BOOLEAN DEFAULT false,
    allow_multiple_attempts  BOOLEAN DEFAULT false,
    show_results_to_student  BOOLEAN DEFAULT true,
    start_date              TIMESTAMPTZ,
    end_date                TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ТАБЛИЦА: test_categories (M:N връзка тест ↔ категория)
-- ============================================================

CREATE TABLE test_categories (
    test_id     UUID REFERENCES tests(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (test_id, category_id)
);

-- ============================================================
-- ТАБЛИЦА: questions
-- Въпроси към тест. Типът е на ниво въпрос, не категория!
-- ============================================================

CREATE TABLE questions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id     UUID REFERENCES tests(id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    type        question_type NOT NULL,
    points      INT DEFAULT 1,
    order_index INT NOT NULL,
    hint        TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ТАБЛИЦА: answers
-- Варианти за отговор към въпрос (за closed/multi типове).
-- ============================================================

CREATE TABLE answers (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    is_correct  BOOLEAN DEFAULT false,
    order_index INT NOT NULL
);

-- ============================================================
-- ТАБЛИЦА: test_attempts
-- Всеки опит на ученик да реши тест.
-- Ученикът НЕ е регистриран — пази се само името му.
-- ============================================================

CREATE TABLE test_attempts (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id            UUID REFERENCES tests(id) ON DELETE CASCADE,
    participant_name   VARCHAR(255) NOT NULL,
    participant_group  VARCHAR(100),
    started_at         TIMESTAMPTZ DEFAULT NOW(),
    finished_at        TIMESTAMPTZ,
    score              INT,
    max_score          INT,
    status             attempt_status DEFAULT 'in_progress',
    termination_reason TEXT,
    ip_address         VARCHAR(45),
    user_agent         TEXT
);

-- ============================================================
-- ТАБЛИЦА: user_answers
-- Конкретните отговори на ученика за всеки въпрос.
-- ============================================================

CREATE TABLE user_answers (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id         UUID REFERENCES test_attempts(id) ON DELETE CASCADE,
    question_id        UUID REFERENCES questions(id) ON DELETE CASCADE,
    selected_answer_id UUID REFERENCES answers(id),
    open_text          TEXT,
    is_correct         BOOLEAN,
    answered_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ИНДЕКСИ за по-бързи заявки
-- ============================================================

CREATE INDEX idx_tests_creator    ON tests(creator_id);
CREATE INDEX idx_tests_share_code ON tests(share_code);
CREATE INDEX idx_questions_test   ON questions(test_id);
CREATE INDEX idx_answers_question ON answers(question_id);
CREATE INDEX idx_attempts_test    ON test_attempts(test_id);
CREATE INDEX idx_user_answers_attempt ON user_answers(attempt_id);
