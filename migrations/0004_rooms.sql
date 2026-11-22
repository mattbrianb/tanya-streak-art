-- Room photos Tanya uploads for the "in a room" previews (photos in KV under r<id>/...).
-- Run once on each database (with --command if --file is refused; see SETUP.md).
CREATE TABLE IF NOT EXISTS rooms (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  key_lg     TEXT    NOT NULL,          -- KV key, ~1600px long edge
  key_th     TEXT    NOT NULL,          -- KV key, ~360px thumbnail for the portal
  width      INTEGER,
  height     INTEGER,
  x          REAL    NOT NULL,          -- where a painting's middle hangs, fraction of photo width
  y          REAL    NOT NULL,          -- ... and of photo height
  s          REAL    NOT NULL,          -- fraction of photo width per cm
  auto       INTEGER NOT NULL DEFAULT 1,-- 1 = the website may use it for any painting
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
