-- Run once against your existing database (e.g. Supabase SQL editor).
-- Non-destructive: safe to re-run. /seed creates the same schema from scratch.

-- What the AI reads off each clothing photo, keyed by the photo's URL (wardrobe outfits share photos).
-- Vocabulary from FitCheck (github.com/HackedRico/FitCheck, Apache-2.0); see app/lib/garments.ts.
CREATE TABLE IF NOT EXISTS garment_tags (
    image_url TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(20) NOT NULL,
    color_family VARCHAR(20) NOT NULL,
    pattern VARCHAR(20) NOT NULL,
    warmth INT NOT NULL CHECK (warmth BETWEEN 1 AND 5),
    waterproof BOOLEAN NOT NULL,
    formality INT NOT NULL CHECK (formality BETWEEN 1 AND 5),
    description VARCHAR(120) NOT NULL,
    tagged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS garment_tags_user_id_idx ON garment_tags(user_id);
