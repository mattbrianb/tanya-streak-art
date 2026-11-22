-- Tanya Streak Art: Cloudflare D1 schema.
-- Run once:  npx wrangler d1 execute tanya-art --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS paintings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,
  title       TEXT    NOT NULL,
  medium      TEXT    NOT NULL DEFAULT 'Oil on canvas',
  description TEXT    NOT NULL DEFAULT '',
  width_cm    REAL,
  height_cm   REAL,
  price       INTEGER,                       -- rand, whole numbers; NULL = price on request
  status      TEXT    NOT NULL DEFAULT 'available'
              CHECK (status IN ('available', 'sold', 'hidden')),
  sort        INTEGER NOT NULL DEFAULT 0,    -- lower shows first
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  sold_at     TEXT,
  kind        TEXT    NOT NULL DEFAULT 'painting'   -- 'commission' = a finished commission (flip-through only)
              CHECK (kind IN ('painting', 'commission')),
  christmas   INTEGER NOT NULL DEFAULT 0,    -- 1 = in the Christmas collection on the home page
  reveal_at   TEXT,                          -- UTC 'YYYY-MM-DDTHH:MM:SSZ': wrapped until then; NULL = shown now
  room        TEXT,                          -- room photo for the "in a room" preview; NULL = automatic
  wall        TEXT,                          -- starting wall in "View on a wall"; NULL = automatic
  frame       TEXT                           -- starting frame there; NULL = automatic
);

CREATE TABLE IF NOT EXISTS images (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  painting_id INTEGER NOT NULL REFERENCES paintings(id) ON DELETE CASCADE,
  key_lg      TEXT    NOT NULL,              -- KV key, ~2000px long edge
  key_md      TEXT    NOT NULL,              -- KV key, ~1000px long edge
  width       INTEGER,
  height      INTEGER,
  position    INTEGER NOT NULL DEFAULT 0     -- 0 = cover photo
);
CREATE INDEX IF NOT EXISTS images_by_painting ON images (painting_id, position);

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

CREATE TABLE IF NOT EXISTS subscribers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  name        TEXT,
  source      TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('commission_tiers', '[{"id":"small","label":"Small","longEdge":40,"price":1450},{"id":"medium","label":"Medium","longEdge":70,"price":2950},{"id":"large","label":"Large","longEdge":100,"price":5600}]'),
  ('popup_enabled', '1'),
  ('popup_heading', 'Be first to see new paintings'),
  ('popup_text', 'Join Tanya''s list for new work, studio sales and when commissions open. A few emails a year, never spam.'),
  ('christmas_enabled', '1'),
  ('christmas_title', 'The Mantelpiece Miniatures'),
  ('christmas_text', 'Little oils for Christmas, R450 to R600, each sold with a little display easel. Made for a mantel, a bookshelf or under the tree.'),
  ('christmas_until', '2027-01-06'),
  ('christmas_drop_at', '');
