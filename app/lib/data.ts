import postgres from "postgres";
import {User, Outfit, PersonalRatingsTrend, ViewerOutfit, UserField} from "./definitions";
import { auth } from "@/auth";
import { outfits } from "./placeholder-data";
const sql = postgres(process.env.POSTGRES_URL!, {ssl: "require"});

export async function fetchPersonalRatings() {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("You must be logged in to fetch ratings.");
    }
    const userId = session.user.id;
    try {
        const data = await sql<PersonalRatingsTrend[]>`
        SELECT user_id, outfits.name, outfit_id, json_agg(
        json_build_object(
        'rating', rating,
        'date', date) ORDER BY date DESC
        ) as ratings
        FROM personal_ratings
        JOIN outfits ON personal_ratings.outfit_id = outfits.id
        WHERE user_id = ${userId}
        GROUP BY outfit_id
        ORDER BY date DESC
        `;
        return data;
    } catch (error) {
        console.error("Database Error: ", error);
        throw new Error("Failed to fetch ratings data.");
    }
}

export async function fetchLatestOutfits() {
    try {
        const data = await sql<ViewerOutfit[]>`
            SELECT outfits.id, outfits.user_id, outfits.name, users.name, outfits.shirt_image_url, outfits.pants_image_url, outfits.shoes_image_url, outfits.hat_accessory_image_url, outfits.glasses_accessory_image_url, outfits.ear_piercings_accessory_image_url, outfits.neck_accessory_image_url, outfits.wrist_accessory_image_url, outfits.pants_accessory_image_url, outfits.bag_accessory_image_url, outfits.rotation_status, outfits.date
            FROM outfits
            JOIN users ON outfits.user_id = users.id
            ORDER BY outfits.date DESC
            LIMIT 5
        `;
        return data;
    } catch (error) {
        console.error("Database Error: ", error);
        throw new Error("Failed to fetch everyone's latest outfits.");
    }
}

export async function mainCardData() {
    try{
        const outfitCountPromise = sql`SELECT COUNT(*) FROM outfits`;
        const userCountPromise = sql`SELECT COUNT(*) FROM users`;
        const data = await Promise.all([
            outfitCountPromise,
            userCountPromise
        ]);
        const numberOfOutfits = Number(data[0][0].count ?? "0");
        const numberOfUsers = Number(data[1][0].count ?? "0");
        return {numberOfOutfits, numberOfUsers};
    } catch (error) {
        console.error("Datbase Error: ", error);
        throw new Error("Failed to fetch main card data.");
    }
}

const OUTFITS_PER_PAGE = 5;
export async function fetchFilteredOutfits(query: string, currentPage: number) {
    const offset = (currentPage - 1) * OUTFITS_PER_PAGE;
    try {
        const outfits = await sql<ViewerOutfit[]>`
            SELECT outfits.id, outfits.user_id, outfits.name, users.name, outfits.shirt_image_url, outfits.pants_image_url, outfits.shoes_image_url, outfits.hat_accessory_image_url, outfits.glasses_accessory_image_url, outfits.ear_piercings_accessory_image_url, outfits.neck_accessory_image_url, outfits.wrist_accessory_image_url, outfits.pants_accessory_image_url, outfits.bag_accessory_image_url, outfits.rotation_status, outfits.date::text AS date
            FROM outfits
            JOIN users ON outfits.user_id = users.id
            WHERE
                users.name ILIKE ${`%${query}%`} OR
                users.email ILIKE ${`%${query}`} OR
                outfits.name ILIKE ${`%${query}`} OR
                outfits.date::text ILIKE ${`%${query}`}
            ORDER BY outfits.date DESC
            LIMIT ${OUTFITS_PER_PAGE} OFFSET ${offset}
        `;
        return outfits;
    } catch (error) {
        console.error("Database Error: ", error);
        throw new Error("Failed to fetch outfits.");
    }
}

export async function fetchOutfitsPages(query: string) {
    try {
        const data = await sql`
        SELECT COUNT(*)
        FROM outfits
        JOIN users ON outfits.user_id = users.id
        WHERE
            users.name ILIKE ${`%${query}%`} OR
            users.email ILIKE ${`%${query}`} OR
            outfits.name ILIKE ${`%${query}`} OR
            outfits.date::text ILIKE ${`%${query}`}
        `;
        const totalPages = Math.ceil(Number(data[0].count) / OUTFITS_PER_PAGE);
        return totalPages;
    } catch (error) {
        console.error("Database Error: ", error);
        throw new Error("Failed to fetch total number of outfits.");
    }
}

export async function fetchOutfitById(id: string) {
    try {
        const data = await sql<ViewerOutfit[]>`
        SELECT outfits.id, outfits.user_id, outfits.name, outfits.shirt_image_url, outfits.pants_image_url, outfits.shoes_image_url, outfits.hat_accessory_image_url, outfits.glasses_accessory_image_url, outfits.ear_piercings_accessory_image_url, outfits.neck_accessory_image_url, outfits.wrist_accessory_image_url, outfits.pants_accessory_image_url, outfits.bag_accessory_image_url, outfits.rotation_status, outfits.date
        FROM outfits
        WHERE outfits.id = ${id}
        `;
        return data[0];
    } catch (error) {
        console.error("Database Error: ", error);
        throw new Error("Failed to fetch outfits.");
    }
}

export async function fetchUsers() {
    try {
        const users = await sql<UserField[]>`
        SELECT
        users.id,
        users.name,
        users.email,
        COUNT(outfits.id) AS total_outfits,
        COUNT(CASE WHEN outfits.rotation_status = 'In rotation' THEN 1 END) AS total_in_rotation,
        COUNT(CASE WHEN outfits.rotation_status = 'Out of rotation' THEN 1 END) AS total_out_of_rotation,
        AVG(outfits.personal_rating) AS avg_self_rating
        FROM users
        LEFT JOIN outfits ON users.id = outfits.user_id
        GROUP BY users.id, users.name, users.email
        ORDER BY users.name ASC LIMIT 25
        `;
        return users;
    } catch (error) {
        console.error("Database Error: ", error);
        throw new Error("Failed to fetch users.");
    }
}

export async function fetchFilteredUsers(query: string) {
    try {
        const data = await sql<UserField[]>`
        SELECT
        users.id,
        users.name,
        users.email,
        COUNT(outfits.id) AS total_outfits,
        COUNT(CASE WHEN outfits.rotation_status = 'In rotation' THEN 1 END) AS total_in_rotation,
        COUNT(CASE WHEN outfits.rotation_status = 'Out of rotation' THEN 1 END) AS total_out_of_rotation,
        AVG(outfits.personal_rating) AS avg_self_rating
        FROM users
        LEFT JOIN outfits ON users.id = outfits.user_id
        WHERE
        users.name ILIKE ${`%${query}%`} OR
        users.email ILIKE ${`%${query}%`}
        GROUP BY users.id, users.name, users.email
        ORDER BY users.name ASC LIMIT 10
        `;
        return data;
    } catch (error) {
        console.error("Database Error: ", error);
        throw new Error("Failed to fetch User table.");
    }
}