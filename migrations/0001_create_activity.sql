CREATE TABLE IF NOT EXISTS activity (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ts           TEXT    NOT NULL,              -- ISO-8601 UTC
  user_email   TEXT,                          -- from Cf-Access-Authenticated-User-Email; NULL if unauth/local
  action       TEXT    NOT NULL CHECK (action IN (
                 'upload','delete','move','copy',
                 'folder-create','share-create','share-revoke'
               )),
  bucket       TEXT    NOT NULL,
  object_key   TEXT,                          -- may be NULL for bucket-scope events (none yet)
  metadata     TEXT                           -- JSON blob (size, shareId, from/to for moves, etc.)
);

CREATE INDEX IF NOT EXISTS idx_activity_ts     ON activity(ts DESC);
CREATE INDEX IF NOT EXISTS idx_activity_bucket ON activity(bucket, ts DESC);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity(action, ts DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user   ON activity(user_email, ts DESC);
