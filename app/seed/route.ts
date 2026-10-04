import bcrypt from "bcrypt";
import {sql} from "../lib/db";
import {users, outfits, ratings} from "../lib/placeholder-data";

async function seedUsers() {
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    await sql`
        CREATE TABLE IF NOT EXISTS users (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT,
            date DATE NOT NULL
        );
    `;
    const insertedUsers = await Promise.all(
        users.map(async (user) => {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            return sql`
                INSERT INTO users (id, name, email, password, date)
                VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword}, ${user.date})
                ON CONFLICT (id) DO NOTHING;
            `
        })
    );
    return insertedUsers;
}

async function seedOutfits() {
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    await sql`
        CREATE TABLE IF NOT EXISTS outfits (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id),
            date DATE NOT NULL,
            name VARCHAR(255),
            shirt_image_url TEXT NOT NULL,
            pants_image_url TEXT NOT NULL,
            shoes_image_url TEXT NOT NULL,
            hat_accessory_image_url TEXT,
            glasses_accessory_image_url TEXT,
            ear_piercings_accessory_image_url TEXT,
            neck_accessory_image_url TEXT,
            wrist_accessory_image_url TEXT,
            pants_accessory_image_url TEXT,
            bag_accessory_image_url TEXT,
            personal_rating INT NOT NULL,
            rotation_status VARCHAR(20) NOT NULL
        );  
    `;
    const insertedOutfits = await Promise.all(
        outfits.map(
            (outfit) => sql`
                INSERT INTO outfits (id, user_id, date, name, shirt_image_url, pants_image_url, shoes_image_url, hat_accessory_image_url, glasses_accessory_image_url, ear_piercings_accessory_image_url, neck_accessory_image_url, wrist_accessory_image_url, pants_accessory_image_url, bag_accessory_image_url, personal_rating, rotation_status)
                VALUES (${outfit.id}, ${outfit.user_id}, ${outfit.date}, ${outfit.name}, ${outfit.shirt_image_url}, ${outfit.pants_image_url}, ${outfit.shoes_image_url}, ${outfit.hat_accessory_image_url ?? null}, ${outfit.glasses_accessory_image_url ?? null}, ${outfit.ear_piercings_accessory_image_url ?? null}, ${outfit.neck_accessory_image_url ?? null}, ${outfit.wrist_accessory_image_url ?? null}, ${outfit.pants_accessory_image_url ?? null}, ${outfit.bag_accessory_image_url ?? null}, ${outfit.personal_rating}, ${outfit.rotation_status})
                ON CONFLICT (id) DO NOTHING;
            `
        )
    );
    return insertedOutfits;
}

async function seedPersonalRatings() {
    await sql`
        CREATE TABLE IF NOT EXISTS personal_ratings (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id),
            outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            rating INT NOT NULL,
            UNIQUE(user_id, outfit_id, date)
        );
    `;
    const insertedRatings = await Promise.all(
        ratings.map((rating) => sql`
            INSERT INTO personal_ratings (user_id, outfit_id, date, rating)
            VALUES (${rating.user_id}, ${rating.outfit_id}, ${rating.date}, ${rating.rating})
            ON CONFLICT (user_id, outfit_id, date) DO NOTHING;
        `)
    );
    return insertedRatings;
}

// Social tables; kept in sync with migrations/001_social_and_google.sql.
async function seedSocial() {
    await sql`
        CREATE TABLE IF NOT EXISTS follows (
            follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            date DATE NOT NULL DEFAULT CURRENT_DATE,
            PRIMARY KEY (follower_id, following_id),
            CHECK (follower_id <> following_id)
        );
    `;
    await sql`
        CREATE TABLE IF NOT EXISTS outfit_ratings (
            rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
            rating INT NOT NULL CHECK (rating BETWEEN 0 AND 10),
            date DATE NOT NULL DEFAULT CURRENT_DATE,
            PRIMARY KEY (rater_id, outfit_id)
        );
    `;
    await sql`CREATE INDEX IF NOT EXISTS outfits_user_id_idx ON outfits(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS follows_following_id_idx ON follows(following_id)`;
    await sql`CREATE INDEX IF NOT EXISTS outfit_ratings_outfit_id_idx ON outfit_ratings(outfit_id)`;
}

export async function GET() {
    // This wipes every table. Never expose it in production.
    if (process.env.NODE_ENV === "production") {
        return Response.json({error: "Seeding is disabled in production."}, {status: 403});
    }
    try {
        await sql`DROP TABLE IF EXISTS outfit_ratings CASCADE`;
        await sql`DROP TABLE IF EXISTS follows CASCADE`;
        await sql`DROP TABLE IF EXISTS personal_ratings CASCADE`;
        await sql`DROP TABLE IF EXISTS outfits CASCADE`;
        await sql`DROP TABLE IF EXISTS users CASCADE`;
        await seedUsers();
        await seedOutfits();
        await seedPersonalRatings();
        await seedSocial();
        return Response.json({message: "Database seeded successfully."});
    } catch (error) {
        return Response.json({error}, {status: 500});
    }
}