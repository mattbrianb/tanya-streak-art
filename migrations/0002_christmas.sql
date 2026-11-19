-- Christmas collection ("The Mantelpiece Miniatures").
-- christmas = 1 puts a painting in the Christmas section at the top of the home page while the collection is on.
-- reveal_at (UTC, 'YYYY-MM-DDTHH:MM:SSZ') keeps a painting wrapped until the next drop; NULL = show straight away.
-- Run once on each database, one statement at a time if --file is refused (see SETUP.md):
--   npx wrangler d1 execute tanya-art --remote --file=migrations/0002_christmas.sql
--   npx wrangler d1 execute tanya-art --local  --file=migrations/0002_christmas.sql
ALTER TABLE paintings ADD COLUMN christmas INTEGER NOT NULL DEFAULT 0;
ALTER TABLE paintings ADD COLUMN reveal_at TEXT;
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('christmas_enabled', '1'),
  ('christmas_title', 'The Mantelpiece Miniatures'),
  ('christmas_text', 'Little oils for Christmas, R450 to R600, each sold with a little display easel. Made for a mantel, a bookshelf or under the tree.'),
  ('christmas_until', '2027-01-06'),
  ('christmas_drop_at', '');
