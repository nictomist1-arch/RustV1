ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN password_salt TEXT;

CREATE UNIQUE INDEX idx_users_username_case_insensitive ON users(lower(username))
    WHERE password_hash IS NOT NULL;
