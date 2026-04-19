DROP INDEX IF EXISTS idx_activity_ts;
CREATE INDEX IF NOT EXISTS idx_activity_ts ON activity(ts DESC, id DESC);
