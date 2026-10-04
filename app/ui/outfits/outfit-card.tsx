import Image from "next/image";
import Link from "next/link";
import {OUTFIT_SLOTS, FeedOutfit} from "@/app/lib/definitions";
import {formatDateToLocal} from "@/app/lib/utils";
import OutfitStatus from "@/app/ui/outfits/status";
import {UpdateOutfit, DeleteOutfit} from "@/app/ui/outfits/buttons";
import RateOutfit from "@/app/ui/outfits/rate-outfit";

export function OutfitImages({outfit, size = 96}: {outfit: FeedOutfit; size?: number}) {
    const pieces = OUTFIT_SLOTS
        .map(slot => ({slot, url: outfit[slot.column]}))
        .filter((p): p is {slot: typeof p.slot; url: string} => !!p.url);
    return (
        <div className="flex flex-wrap justify-center gap-2">
            {pieces.map(({slot, url}) => (
                <div key={slot.key} className="relative overflow-hidden rounded-md bg-white" style={{width: size, height: size}}>
                    <Image src={url} alt={`${outfit.user_name}'s ${slot.label.toLowerCase()}`} fill sizes={`${size}px`} className="object-contain" />
                </div>
            ))}
        </div>
    );
}

export function RatingSummary({outfit}: {outfit: FeedOutfit}) {
    if (!outfit.friend_rating_count) return <span className="text-gray-400">No ratings yet</span>;
    return (
        <span>
            {outfit.avg_friend_rating?.toFixed(1)}/10 from {outfit.friend_rating_count} {outfit.friend_rating_count === 1 ? "rating" : "ratings"}
        </span>
    );
}

// `mode`: "owner" shows edit/delete, "viewer" shows the rating control, "plain" shows neither.
export default function OutfitCard({outfit, mode, showOwner = false}: {outfit: FeedOutfit; mode: "owner" | "viewer" | "plain"; showOwner?: boolean}) {
    return (
        <div className="flex flex-col rounded-xl bg-gray-50 p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate font-semibold">{outfit.name ?? `${outfit.user_name}'s outfit`}</p>
                    <p className="text-xs text-gray-500">
                        {showOwner && (
                            <>
                                <Link href={`/dashboard/connect/${outfit.user_id}`} className="font-medium text-blue-600 hover:underline">
                                    {outfit.user_name}
                                </Link>
                                {" · "}
                            </>
                        )}
                        {formatDateToLocal(outfit.date)}
                    </p>
                </div>
                <OutfitStatus status={outfit.rotation_status} />
            </div>
            <OutfitImages outfit={outfit} />
            <div className="mt-3 flex items-end justify-between gap-2 text-sm">
                {mode === "viewer" ? (
                    <RateOutfit outfitId={outfit.id} myRating={outfit.my_rating} />
                ) : (
                    <p className="text-xs text-gray-600">Friends: <RatingSummary outfit={outfit} /></p>
                )}
                {mode === "owner" && (
                    <div className="flex gap-2">
                        <UpdateOutfit id={outfit.id} />
                        <DeleteOutfit id={outfit.id} />
                    </div>
                )}
            </div>
            {mode === "viewer" && (
                <p className="mt-2 text-xs text-gray-600">Friends: <RatingSummary outfit={outfit} /></p>
            )}
        </div>
    );
}
