-- Rename Venue.costPerSession to Venue.costPerHour.
-- The venue's reference cost is now an hourly rate rather than a flat
-- "typical session" cost, since real venues (e.g. INSZN) price linearly
-- per hour. Uses RENAME COLUMN rather than drop+add to preserve existing
-- data during the migration itself (the value is corrected separately).
ALTER TABLE "Venue" RENAME COLUMN "costPerSession" TO "costPerHour";
