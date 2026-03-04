-- ============================================
-- OKR Tracking System - ERD Schema Script
-- Use with: MySQL Workbench, pgAdmin, DBeaver,
-- dbdiagram.io, or any SQL-based ERD tool
-- ============================================

-- Drop tables if exist (for re-running)
DROP TABLE IF EXISTS evaluations;
DROP TABLE IF EXISTS key_results;
DROP TABLE IF EXISTS objectives;
DROP TABLE IF EXISTS user_departments;
DROP TABLE IF EXISTS department;
DROP TABLE IF EXISTS division;
DROP TABLE IF EXISTS score_levels;
DROP TABLE IF EXISTS users;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id              UUID PRIMARY KEY,
    username        VARCHAR(255) NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255),
    role            VARCHAR(50) NOT NULL,  -- ENUM: EMPLOYEE, DEPARTMENT_LEADER, HR, DIRECTOR, BUSINESS_BLOCK, ADMIN
    profile_photo_url VARCHAR(500),
    job_title       VARCHAR(255),
    phone_number    VARCHAR(50),
    bio             VARCHAR(1000),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    can_edit_assigned_departments BOOLEAN NOT NULL DEFAULT FALSE,
    last_login      TIMESTAMP,
    created_at      TIMESTAMP NOT NULL,
    updated_at      TIMESTAMP
);

-- ============================================
-- DIVISION TABLE
-- ============================================
CREATE TABLE division (
    id              VARCHAR(36) PRIMARY KEY,  -- UUID as string
    name            VARCHAR(255),
    leader_id       UUID,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,

    CONSTRAINT fk_division_leader
        FOREIGN KEY (leader_id) REFERENCES users(id)
);

-- ============================================
-- DEPARTMENT TABLE
-- ============================================
CREATE TABLE department (
    id              VARCHAR(36) PRIMARY KEY,  -- UUID as string
    name            VARCHAR(255) NOT NULL,
    division_id     VARCHAR(36) NOT NULL,
    leader_id       UUID,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,

    CONSTRAINT fk_department_division
        FOREIGN KEY (division_id) REFERENCES division(id),
    CONSTRAINT fk_department_leader
        FOREIGN KEY (leader_id) REFERENCES users(id)
);

-- ============================================
-- USER_DEPARTMENTS (Join Table - Many-to-Many)
-- ============================================
CREATE TABLE user_departments (
    user_id         UUID NOT NULL,
    department_id   VARCHAR(36) NOT NULL,

    PRIMARY KEY (user_id, department_id),
    CONSTRAINT fk_ud_user
        FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_ud_department
        FOREIGN KEY (department_id) REFERENCES department(id)
);

-- ============================================
-- OBJECTIVES TABLE
-- ============================================
CREATE TABLE objectives (
    id              VARCHAR(36) PRIMARY KEY,  -- UUID as string
    name            VARCHAR(255) NOT NULL,
    weight          INTEGER NOT NULL,  -- Percentage 0-100
    department_id   VARCHAR(36),
    employee_id     UUID,
    level           VARCHAR(50) NOT NULL,  -- ENUM: DEPARTMENT, INDIVIDUAL

    CONSTRAINT fk_objective_department
        FOREIGN KEY (department_id) REFERENCES department(id),
    CONSTRAINT fk_objective_employee
        FOREIGN KEY (employee_id) REFERENCES users(id)
);

-- ============================================
-- KEY_RESULTS TABLE
-- ============================================
CREATE TABLE key_results (
    id                      VARCHAR(36) PRIMARY KEY,  -- UUID as string
    name                    VARCHAR(255) NOT NULL,
    description             TEXT,
    metric_type             VARCHAR(50) NOT NULL,  -- ENUM: HIGHER_BETTER, LOWER_BETTER, QUALITATIVE
    unit                    VARCHAR(100),
    weight                  INTEGER NOT NULL,  -- Percentage 0-100
    threshold_below         DOUBLE PRECISION,
    threshold_meets         DOUBLE PRECISION,
    threshold_good          DOUBLE PRECISION,
    threshold_very_good     DOUBLE PRECISION,
    threshold_exceptional   DOUBLE PRECISION,
    actual_value            VARCHAR(255),
    objective_id            VARCHAR(36) NOT NULL,

    CONSTRAINT fk_kr_objective
        FOREIGN KEY (objective_id) REFERENCES objectives(id)
);

-- ============================================
-- EVALUATIONS TABLE
-- ============================================
CREATE TABLE evaluations (
    id              UUID PRIMARY KEY,
    evaluator_id    UUID NOT NULL,
    evaluator_type  VARCHAR(50) NOT NULL,  -- ENUM: DIRECTOR, HR, BUSINESS_BLOCK
    target_type     VARCHAR(50) NOT NULL,  -- 'DEPARTMENT' or 'EMPLOYEE'
    target_id       UUID NOT NULL,
    numeric_rating  DOUBLE PRECISION,      -- For DIRECTOR (4.25-5.0) and BUSINESS_BLOCK (1-5)
    letter_rating   VARCHAR(5),            -- For HR (A, B, C, D)
    comment         TEXT,
    status          VARCHAR(50) NOT NULL,  -- ENUM: DRAFT, SUBMITTED, APPROVED
    created_at      TIMESTAMP NOT NULL,
    updated_at      TIMESTAMP,

    CONSTRAINT fk_evaluation_evaluator
        FOREIGN KEY (evaluator_id) REFERENCES users(id)
);

-- ============================================
-- SCORE_LEVELS TABLE
-- ============================================
CREATE TABLE score_levels (
    id              VARCHAR(36) PRIMARY KEY,  -- UUID as string
    name            VARCHAR(255) NOT NULL,    -- e.g., "Below", "Meets", "Good"
    score_value     DOUBLE PRECISION NOT NULL,-- e.g., 3.0, 4.25, 4.5
    color           VARCHAR(20) NOT NULL,     -- e.g., "#d9534f"
    display_order   INTEGER NOT NULL,         -- 0, 1, 2, 3, 4
    is_default      BOOLEAN NOT NULL
);

-- ============================================
-- INDEXES (for better query performance)
-- ============================================
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_department_division ON department(division_id);
CREATE INDEX idx_objectives_department ON objectives(department_id);
CREATE INDEX idx_objectives_employee ON objectives(employee_id);
CREATE INDEX idx_key_results_objective ON key_results(objective_id);
CREATE INDEX idx_evaluations_target ON evaluations(target_type, target_id);
CREATE INDEX idx_evaluations_evaluator ON evaluations(evaluator_id);
