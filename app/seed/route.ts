import bcrypt from "bcrypt";
import postgres from "postgres";
import {users, outfits, ratings} from "../lib/placeholder-data";

const sql = postgres(process.env.POSTGRES_URL!, {ssl: "require"});

async function seedUsers() {
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    await sql`
        CREATE TABLE IF NOT EXISTS users (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
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
            outfit_id UUID NOT NULL REFERENCES outfits(id),
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

export async function GET() {
    try {
        await sql`DROP TABLE IF EXISTS personal_ratings CASCADE`;
        await sql`DROP TABLE IF EXISTS outfits CASCADE`;
        await sql`DROP TABLE IF EXISTS users CASCADE`;
        await seedUsers();
        await seedOutfits();
        await seedPersonalRatings();
        return Response.json({message: "Database seeded successfully."});
    } catch (error) {
        return Response.json({error}, {status: 500});
    }
}