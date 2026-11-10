-- Run once against the D1 database bound as DB.
CREATE TABLE IF NOT EXISTS seen (
  batch_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  at INTEGER NOT NULL
);
