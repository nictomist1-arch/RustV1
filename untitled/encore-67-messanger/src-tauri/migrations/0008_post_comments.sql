CREATE TABLE post_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    body TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 1000),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_post_comments_message_id ON post_comments(message_id);

CREATE TRIGGER post_comments_channel_members_only
BEFORE INSERT ON post_comments
WHEN NOT EXISTS (
    SELECT 1 FROM messages
    JOIN chats ON chats.id = messages.chat_id
    WHERE messages.id = NEW.message_id AND chats.kind = 'channel'
      AND (chats.owner_id = NEW.author_id OR chats.participant_ids IS NULL
        OR EXISTS (SELECT 1 FROM json_each(chats.participant_ids) WHERE value = NEW.author_id))
)
BEGIN
    SELECT RAISE(ABORT, 'Only channel members can comment on posts');
END;

CREATE TRIGGER delete_post_comments
AFTER DELETE ON messages
BEGIN
    DELETE FROM post_comments WHERE message_id = OLD.id;
END;
