ALTER TABLE chats ADD COLUMN kind TEXT NOT NULL DEFAULT 'chat'
    CHECK (kind IN ('chat', 'channel'));

ALTER TABLE chats ADD COLUMN owner_id INTEGER REFERENCES users(id);

CREATE TRIGGER channel_requires_owner
BEFORE INSERT ON chats
WHEN NEW.kind = 'channel' AND NEW.owner_id IS NULL
BEGIN
    SELECT RAISE(ABORT, 'Channel requires an owner');
END;

CREATE TRIGGER channel_posts_owner_only
BEFORE INSERT ON messages
WHEN EXISTS (
    SELECT 1 FROM chats
    WHERE id = NEW.chat_id AND kind = 'channel'
      AND owner_id IS NOT NEW.author_id
)
BEGIN
    SELECT RAISE(ABORT, 'Only the channel owner can publish posts');
END;

CREATE TRIGGER channel_posts_update_owner_only
BEFORE UPDATE ON messages
WHEN EXISTS (
    SELECT 1 FROM chats
    WHERE id = NEW.chat_id AND kind = 'channel'
      AND owner_id IS NOT NEW.author_id
)
BEGIN
    SELECT RAISE(ABORT, 'Only the channel owner can publish posts');
END;
