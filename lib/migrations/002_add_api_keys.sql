-- ==========================================
-- API Keys Table
-- AWS-style API key authentication
-- ==========================================

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- User-friendly name for the key
  key_prefix TEXT NOT NULL UNIQUE,  -- First 8 chars (e.g., 'sk_live_')
  key_hash TEXT NOT NULL UNIQUE,  -- SHA-256 hash of the full key

  -- Permissions
  scopes TEXT NOT NULL DEFAULT 'read,write',  -- Comma-separated: read, write, admin

  -- Status
  is_active INTEGER NOT NULL DEFAULT 1,  -- 0 = revoked, 1 = active

  -- Usage tracking
  last_used_at TEXT,  -- ISO timestamp
  usage_count INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,  -- Optional expiration date

  -- Audit info
  created_ip TEXT,
  last_used_ip TEXT,
  user_agent TEXT
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active, expires_at);

-- ==========================================
-- API Key Usage Logs (Optional, for audit)
-- ==========================================

CREATE TABLE IF NOT EXISTS api_key_usage_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  api_key_id TEXT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

  -- Request info
  method TEXT NOT NULL,  -- GET, POST, PUT, DELETE
  endpoint TEXT NOT NULL,  -- /api/v1/projects
  status_code INTEGER NOT NULL,  -- 200, 404, 500, etc.

  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_key ON api_key_usage_logs(api_key_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_timestamp ON api_key_usage_logs(timestamp);
