CREATE TABLE books (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(60) NOT NULL,
    description VARCHAR(160) NOT NULL,
    icon VARCHAR(8) NOT NULL,
    category VARCHAR(10) NOT NULL,
    color VARCHAR(7) NOT NULL,
    ink VARCHAR(7) NOT NULL,
    archived BIT NOT NULL,
    deleted BIT NOT NULL,
    last_study DATE NULL,
    completed DATE NULL,
    created_at DATETIME(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE cards (
    id VARCHAR(36) PRIMARY KEY,
    book_id VARCHAR(36) NOT NULL,
    type VARCHAR(10) NOT NULL,
    question LONGTEXT NOT NULL,
    answer LONGTEXT NOT NULL,
    explanation LONGTEXT NOT NULL,
    options_json LONGTEXT NULL,
    correct_index INT NULL,
    level INT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_card_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    CONSTRAINT ck_card_level CHECK (level BETWEEN 1 AND 5),
    CONSTRAINT ck_card_type CHECK (type IN ('qa', 'blank', 'choice')),
    CONSTRAINT ck_card_correct CHECK ((type = 'choice' AND correct_index IS NOT NULL AND correct_index BETWEEN 0 AND 3 AND options_json IS NOT NULL) OR (type <> 'choice' AND correct_index IS NULL AND options_json IS NULL)),
    INDEX ix_card_book_created (book_id, created_at, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE card_assets (
    id VARCHAR(36) PRIMARY KEY,
    card_id VARCHAR(36) NOT NULL,
    asset_id VARCHAR(100) NOT NULL,
    mime VARCHAR(30) NOT NULL,
    content MEDIUMBLOB NOT NULL,
    CONSTRAINT fk_asset_card FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    CONSTRAINT uk_card_asset UNIQUE (card_id, asset_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE evaluations (
    id VARCHAR(36) PRIMARY KEY,
    book_id VARCHAR(36) NOT NULL,
    card_id VARCHAR(36) NULL,
    original_card_id VARCHAR(36) NOT NULL,
    study_date DATE NOT NULL,
    evaluated_at DATETIME(6) NOT NULL,
    is_known BIT NOT NULL,
    duration_ms BIGINT NOT NULL,
    reveal_ms BIGINT NULL,
    level_after INT NOT NULL,
    CONSTRAINT fk_evaluation_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    CONSTRAINT fk_evaluation_card FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE SET NULL,
    CONSTRAINT ck_evaluation_level CHECK (level_after BETWEEN 1 AND 5),
    CONSTRAINT ck_evaluation_duration CHECK (duration_ms BETWEEN 0 AND 86400000),
    CONSTRAINT ck_evaluation_reveal CHECK (reveal_ms IS NULL OR reveal_ms BETWEEN 0 AND duration_ms),
    INDEX ix_evaluation_book_at (book_id, evaluated_at, id),
    INDEX ix_evaluation_card_at (original_card_id, evaluated_at, id),
    INDEX ix_evaluation_date (study_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE evaluation_requests (
    request_key VARCHAR(36) PRIMARY KEY,
    book_id VARCHAR(36) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    response_json LONGTEXT NOT NULL,
    CONSTRAINT fk_request_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE study_settings (
    id INT PRIMARY KEY,
    shortcuts BIT NOT NULL,
    reveal_key VARCHAR(10) NOT NULL,
    unknown_key VARCHAR(10) NOT NULL,
    known_key VARCHAR(10) NOT NULL,
    alarm BIT NOT NULL,
    alarm_time VARCHAR(5) NOT NULL,
    time_limit INT NOT NULL,
    alarm_last_date DATE NULL,
    CONSTRAINT ck_settings_limit CHECK (time_limit BETWEEN 0 AND 600)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

INSERT INTO study_settings VALUES (1, b'1', 'Space', '1', '2', b'0', '20:00', 0, NULL);

CREATE TABLE refresh_sessions (
    id VARCHAR(36) PRIMARY KEY,
    token_hash VARCHAR(64) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    revoked BIT NOT NULL,
    created_at DATETIME(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
