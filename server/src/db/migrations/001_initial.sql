CREATE TABLE IF NOT EXISTS monitors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  interval INTEGER NOT NULL DEFAULT 300,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  last_status TEXT,
  last_checked_at INTEGER,
  last_status_code INTEGER,
  last_response_time INTEGER
);

CREATE TABLE IF NOT EXISTS check_logs (
  id TEXT PRIMARY KEY,
  monitor_id TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  status_code INTEGER,
  response_time INTEGER,
  error TEXT,
  checked_at INTEGER NOT NULL
);
