-- Run once against your existing database (e.g. Supabase SQL editor).
-- Non-destructive: safe to re-run. /seed creates the same schema from scratch.

-- Every rating a friend gives, one row per rater per outfit per day, so the dashboard can chart trends.
-- outfit_ratings still holds each rater's current rating.
CREATE TABLE IF NOT EXISTS outfit_rating_history (
    rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 0 AND 10),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (rater_id, outfit_id, date)
);

CREATE INDEX IF NOT EXISTS outfit_rating_history_outfit_id_idx ON outfit_rating_history(outfit_id);

-- Backfill from the ratings that already exist.
INSERT INTO outfit_rating_history (rater_id, outfit_id, rating, date)
SELECT rater_id, outfit_id, rating, date FROM outfit_ratings
ON CONFLICT DO NOTHING;
