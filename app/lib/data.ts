import {sql} from "./db";
import {requireUserId} from "./session";
import {
    Outfit,
    PersonalRatingsTrend,
    FeedOutfit,
    UserField,
    DashboardCards,
} from "./definitions";

// Columns shared by every outfit query. Dates come back as text so they're safe to render/serialize.
const outfitColumns = sql`
    outfits.id, outfits.user_id, outfits.name,
    outfits.shirt_image_url, outfits.pants_image_url, outfits.shoes_image_url,
    outfits.hat_accessory_image_url, outfits.glasses_accessory_image_url, outfits.ear_piercings_accessory_image_url,
    outfits.neck_accessory_image_url, outfits.wrist_accessory_image_url, outfits.pants_accessory_image_url,
    outfits.bag_accessory_image_url, outfits.rotation_status, outfits.date::text AS date
`;

// Outfit + owner name + rating aggregates from other users, from the viewer's perspective.
function feedColumns(viewerId: string) {
    return sql`
        ${outfitColumns},
        users.name AS user_name,
        (SELECT AVG(r.rating)::float8 FROM outfit_ratings r WHERE r.outfit_id = outfits.id) AS avg_friend_rating,
        (SELECT COUNT(*)::int FROM outfit_ratings r WHERE r.outfit_id = outfits.id) AS friend_rating_count,
        (SELECT r.rating FROM outfit_ratings r WHERE r.outfit_id = outfits.id AND r.rater_id = ${viewerId}) AS my_rating
    `;
}

export async function fetchPersonalRatings() {
    const userId = await requireUserId();
    try {
        return await sql<PersonalRatingsTrend[]>`
            SELECT
                outfits.id AS outfit_id,
                COALESCE(outfits.name, 'Untitled outfit') AS outfit_name,
                json_agg(json_build_object('rating', pr.rating, 'date', pr.date::text) ORDER BY pr.date) AS ratings
            FROM personal_ratings pr
            JOIN outfits ON pr.outfit_id = outfits.id
            WHERE outfits.user_id = ${userId}
            GROUP BY outfits.id, outfits.name
            ORDER BY MAX(pr.date) DESC
            LIMIT 6
        `;
    } catch (error) {
        console.error("Database Error: ", error);
        throw new Error("Failed to fetch ratings data.");
    }
}

// Site-wide totals for the public landing page (no login required).
export async function mainCardData() {
    try {
        const [row] = await sql`
            SELECT
                (SELECT COUNT(*)::int FROM outfits) AS outfits,
                (SELECT COUNT(*)::int FROM users) AS users
        `;
        return {numberOfOutfits: row.outfits as number, numberOfUsers: row.users as number};
    } catch (error) {
        console.error("Database Error: ", error);
        throw new Error("Failed to fetch main card data.");
    }
}

// Latest outfits from people you follow.
export async function fetchFeedOutfits(limit = 5) {
    const userId = await requireUserId();
    try {
        return await sql<FeedOutfit[]>`
            SELECT ${feedColumns(userId)}
            FROM outfits
            JOIN users ON outfits.user_id = users.id
            JOIN follows ON follows.following_id = outfits.user_id AND follows.follower_id = ${userId}
            ORDER BY outfits.date DESC, outfits.id
            LIMIT ${limit}
        `;
    } catch (error) {
        console.error("Database Error: ", error);
        throw new Error("Failed to fetch your feed.");
    }
}

export async function fetchDashboardCards(): Promise<DashboardCards> {
    const userId = await requireUserId();
    try {
        const [row] = await sql`
            SELECT
                (SELECT COUNT(*)::int FROM outfits WHERE user_id = ${userId}) AS total_outfits,
                (SELECT COUNT(*)::int FROM outfits WHERE user_id = ${userId} AND rotation_status = 'In rotation') AS in_rotation,
                (SELECT AVG(personal_rating)::float8 FROM outfits WHERE user_id = ${userId}) AS avg_self_rating,
                (SELECT AVG(r.rating)::float8 FROM outfit_ratings r JOIN outfits o ON r.outfit_id = o.id WHERE o.user_id = ${userId}) AS avg_friend_rating,
                (SELECT COUNT(*)::int FROM follows WHERE following_id = ${userId}) AS followers,
                (SELECT COUNT(*)::int FROM follows WHERE follower_id = ${userId}) AS following
        `;
        return {
            totalOutfits: row.total_outfits,
            inRotation: row.in_rotation,
            avgSelfRating: row.avg_self_rating,
            avgFriendRating: row.avg_friend_rating,
            followers: row.followers,
            following: row.following,
        };
    } catch (error) {
        console.error("Database Error: ", error);
        throw new Error("Failed to fetch dashboard card data.");
    }
}

const OUTFITS_PER_PAGE = 6;

function myOutfitsFilter(userId: string, query: string) {
    const pattern = `%${query}%`;
    return sql`
        WHERE outfits.user_id = ${userId} AND (
            COALESCE(outfits.name, '') ILIKE ${pattern} OR
            outfits.rotation_status ILIKE ${pattern} OR
            outfits.date::text ILIKE ${pattern}
        )
    `;
}

// The signed-in user's own outfits, paginated.
export async function fetchFilteredOutfits(query: string, currentPage: number) {
    const userId = await requireUserId();
    const offset = (currentPage - 1) * OUTFITS_PER_PAGE;
    try {
        return await sql<FeedOutfit[]>`
            SELECT ${feedColumns(userId)}
            FROM outfits
            JOIN users ON outfits.user_id = users.id
            ${myOutfitsFilter(userId, query)}
            ORDER BY outfits.date DESC, outfits.id
            LIMIT ${OUTFITS_PER_PAGE} OFFSET ${offset}
        `;
    } catch (error) {
        console.error("Database Error: ", error);
        throw new Error("Failed to fetch outfits.");
    }
}

export async function fetchOutfitsPages(query: string) {
    const userId = await requireUserId();
    try {
        const [row] = await sql`
            SELECT COUNT(*)::int AS count FROM outfits ${myOutfitsFilter(userId, query)}
        `;
        return Math.ceil(row.count / OUTFITS_PER_PAGE);
    } catch (error) {
        console.error("Database Error: ", error);
        throw new Error("Failed to fetch total number of outfits.");
    }
}

// Only returns the outfit if the signed-in user owns it.
export async function fetchOutfitById(id: string): Promise<Outfit | undefined> {
    const userId = await requireUserId();
    try {
        const data = await sql<Outfit[]>`
            SELECT ${outfitColumns}, outfits.personal_rating
            FROM outfits
            WHERE outfits.id = ${id} AND outfits.user_id = ${userId}
        `;
        return data[0];
    } catch (error) {
        // Invalid UUIDs raise a cast error; treat them as not found.
        console.error("Database Error: ", error);
        return undefined;
    }
}

// The signed-in user's outfits that are in rotation, for picking an outfit of the day.
export async function fetchOotdCandidates() {
    const userId = await requireUserId();
    try {
        return await sql<(FeedOutfit & {personal_rating: number})[]>`
            SELECT ${feedColumns(userId)}, outfits.personal_rating
            FROM outfits
            JOIN users ON outfits.user_id = users.id
            WHERE outfits.user_id = ${userId} AND outfits.rotation_status = 'In rotation'
            ORDER BY outfits.date DESC, outfits.id
        `;
    } catch (error) {
        console.error("Database Error: ", error);
        throw new Error("Failed to fetch outfits in rotation.");
    }
}

function userFieldColumns(viewerId: string) {
    return sql`
        users.id,
        users.name,
        users.email,
        COUNT(outfits.id)::int AS total_outfits,
        COUNT(CASE WHEN outfits.rotation_status = 'In rotation' THEN 1 END)::int AS total_in_rotation,
        COUNT(CASE WHEN outfits.rotation_status = 'Out of rotation' THEN 1 END)::int AS total_out_of_rotation,
        ROUND(AVG(outfits.personal_rating), 1)::float8 AS avg_self_rating,
        EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ${viewerId} AND f.following_id = users.id) AS is_following
    `;
}

// Everyone except the signed-in user, matching the search.
export async function fetchFilteredUsers(query: string) {
    const userId = await requireUserId();
    const pattern = `%${query}%`;
    try {
        return await sql<UserField[]>`
            SELECT ${userFieldColumns(userId)}
            FROM users
            LEFT JOIN outfits ON users.id = outfits.user_id
            WHERE users.id <> ${userId} AND (users.name ILIKE ${pattern} OR users.email ILIKE ${pattern})
            GROUP BY users.id, users.name, users.email
            ORDER BY users.name ASC
            LIMIT 25
        `;
    } catch (error) {
        console.error("Database Error: ", error);
        throw new Error("Failed to fetch User table.");
    }
}

export async function fetchUserProfile(profileId: string) {
    const userId = await requireUserId();
    try {
        const [user] = await sql<UserField[]>`
            SELECT ${userFieldColumns(userId)}
            FROM users
            LEFT JOIN outfits ON users.id = outfits.user_id
            WHERE users.id = ${profileId}
            GROUP BY users.id, users.name, users.email
        `;
        if (!user) return undefined;
        const outfits = await sql<FeedOutfit[]>`
            SELECT ${feedColumns(userId)}
            FROM outfits
            JOIN users ON outfits.user_id = users.id
            WHERE outfits.user_id = ${profileId}
            ORDER BY outfits.date DESC, outfits.id
        `;
        return {user, outfits, isSelf: profileId === userId};
    } catch (error) {
        console.error("Database Error: ", error);
        return undefined;
    }
}
