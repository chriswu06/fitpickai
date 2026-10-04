-- Run once against your existing database (e.g. Supabase SQL editor).
-- Non-destructive: safe to re-run. /seed creates the same schema from scratch.

-- Google sign-in accounts don't have a password.
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- Deleting an outfit removes its rating history.
ALTER TABLE personal_ratings DROP CONSTRAINT IF EXISTS personal_ratings_outfit_id_fkey;
ALTER TABLE personal_ratings
    ADD CONSTRAINT personal_ratings_outfit_id_fkey
    FOREIGN KEY (outfit_id) REFERENCES outfits(id) ON DELETE CASCADE;

-- Who follows whom.
CREATE TABLE IF NOT EXISTS follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id <> following_id)
);

-- Ratings that other users give your outfits. One rating per rater per outfit (latest wins).
CREATE TABLE IF NOT EXISTS outfit_ratings (
    rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 0 AND 10),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (rater_id, outfit_id)
);

CREATE INDEX IF NOT EXISTS outfits_user_id_idx ON outfits(user_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON follows(following_id);
CREATE INDEX IF NOT EXISTS outfit_ratings_outfit_id_idx ON outfit_ratings(outfit_id);
