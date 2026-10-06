export type User = {
    id: string;
    name: string;
    email: string;
    password: string | null; // null for Google-only accounts
    date: string;
};

export type RotationStatus = "In rotation" | "Out of rotation";

export type Outfit = {
    id: string;
    user_id: string; // Foreign Key
    name: string | null;
    shirt_image_url: string;
    pants_image_url: string;
    //Socks will be plain white
    shoes_image_url: string;
    hat_accessory_image_url: string | null;
    glasses_accessory_image_url: string | null;
    ear_piercings_accessory_image_url: string | null;
    neck_accessory_image_url: string | null;
    wrist_accessory_image_url: string | null;
    pants_accessory_image_url: string | null;
    bag_accessory_image_url: string | null;
    rotation_status: RotationStatus;
    personal_rating: number;
    date: string;
};

// Form field key -> DB column for every image slot on an outfit.
export const OUTFIT_SLOTS = [
    {key: "shirtImageUrl", column: "shirt_image_url", label: "Shirt", required: true},
    {key: "pantsImageUrl", column: "pants_image_url", label: "Pants / shorts", required: true},
    {key: "shoesImageUrl", column: "shoes_image_url", label: "Shoes", required: true},
    {key: "hatAccessoryImageUrl", column: "hat_accessory_image_url", label: "Hat", required: false},
    {key: "glassesAccessoryImageUrl", column: "glasses_accessory_image_url", label: "Glasses", required: false},
    {key: "earPiercingsAccessoryImageUrl", column: "ear_piercings_accessory_image_url", label: "Ear piercings", required: false},
    {key: "neckAccessoryImageUrl", column: "neck_accessory_image_url", label: "Necklace / scarf", required: false},
    {key: "wristAccessoryImageUrl", column: "wrist_accessory_image_url", label: "Watch / bracelet", required: false},
    {key: "pantsAccessoryImageUrl", column: "pants_accessory_image_url", label: "Belt / chain", required: false},
    {key: "bagAccessoryImageUrl", column: "bag_accessory_image_url", label: "Bag", required: false},
] as const;

export type OutfitSlot = (typeof OUTFIT_SLOTS)[number];
export type OutfitSlotKey = OutfitSlot["key"];
export type OutfitImageColumn = OutfitSlot["column"];

export type PersonalRatingsTrend = {
    outfit_id: string; //Foreign Key
    outfit_name: string;
    ratings: {
        rating: number;
        date: string;
    }[];
};

export type ViewerOutfit = Omit<Outfit, 'personal_rating'> & {
    user_name: string;
};

// An outfit as seen in a feed: includes ratings from other users.
export type FeedOutfit = ViewerOutfit & {
    avg_friend_rating: number | null;
    friend_rating_count: number;
    my_rating: number | null;
};

export type UserField = {
    id: string;
    name: string;
    email: string;
    total_outfits: number;
    total_in_rotation: number;
    total_out_of_rotation: number;
    avg_self_rating: number | null;
    is_following: boolean;
};

export type DashboardCards = {
    totalOutfits: number;
    inRotation: number;
    avgSelfRating: number | null;
    avgFriendRating: number | null;
    followers: number;
    following: number;
};

export type WardrobeItem = {
    url: string;
    outfit_id: string; // An outfit this piece appears in.
};

export type Wardrobe = {
    slots: {column: OutfitImageColumn; label: string; required: boolean; items: WardrobeItem[]}[];
    // Existing outfits, so the closet can say when a combo is already saved.
    outfits: {id: string; name: string | null; images: Partial<Record<OutfitImageColumn, string>>}[];
};
