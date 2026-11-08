-- Finished commissions live alongside paintings, marked kind = 'commission'.
-- They show in the "Completed commissions" flip-through, never in the shop, gallery or 3D walk.
-- Run once on each database:
--   npx wrangler d1 execute tanya-art --remote --file=migrations/0001_commissions.sql
--   npx wrangler d1 execute tanya-art --local  --file=migrations/0001_commissions.sql
ALTER TABLE paintings ADD COLUMN kind TEXT NOT NULL DEFAULT 'painting' CHECK (kind IN ('painting', 'commission'));
