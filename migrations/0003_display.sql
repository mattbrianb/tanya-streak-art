-- How each painting is shown, chosen by Tanya in the portal (NULL = the website chooses):
--   room  = the room photo for the "in a room" preview (an id from public/js/rooms.js)
--   wall  = the starting wall in "View on a wall" (white, plaster, sage, charcoal, brick, ...)
--   frame = the starting frame there (timber, canvas, float, oak)
-- Run once on each database (one statement at a time with --command if --file is refused; see SETUP.md).
ALTER TABLE paintings ADD COLUMN room TEXT;
ALTER TABLE paintings ADD COLUMN wall TEXT;
ALTER TABLE paintings ADD COLUMN frame TEXT;
