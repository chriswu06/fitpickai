import Image from "next/image";
import Link from "next/link";
import {ShoppingCartIcon} from "@heroicons/react/24/outline";
import {OUTFIT_SLOTS, FeedOutfit} from "@/app/lib/definitions";
import {formatDateToLocal} from "@/app/lib/utils";
import OutfitStatus from "@/app/ui/outfits/status";
import {UpdateOutfit, DeleteOutfit} from "@/app/ui/outfits/buttons";
import RateOutfit from "@/app/ui/outfits/rate-outfit";

// Opens an Amazon search for items like this one (see app/api/shop/route.ts).
export function ShopLink({outfitId, column, label, className}: {outfitId: string; column: string; label: string; className?: string}) {
    return (
        <a
            href={`/api/shop?outfit=${outfitId}&slot=${column}`}
            target="_blank"
            rel="noopener noreferrer"
            title={`Shop similar ${label.toLowerCase()} on Amazon`}
            aria-label={`Shop similar ${label.toLowerCase()} on Amazon`}
            className={className ?? "absolute bottom-1 right-1 rounded-full bg-white/90 p-1 text-gray-700 shadow hover:bg-pink-500 hover:text-white"}
        >
            <ShoppingCartIcon className="h-4 w-4" />
        </a>
    );
}

// `shoppable` adds a "shop similar" button to each piece.
export function OutfitImages({outfit, size = 96, shoppable = false}: {outfit: FeedOutfit; size?: number; shoppable?: boolean}) {
    const pieces = OUTFIT_SLOTS
        .map(slot => ({slot, url: outfit[slot.column]}))
        .filter((p): p is {slot: typeof p.slot; url: string} => !!p.url);
    return (
        <div className="flex flex-wrap justify-center gap-2">
            {pieces.map(({slot, url}) => (
                <div key={slot.key} className="relative overflow-hidden rounded-md bg-white" style={{width: size, height: size}}>
                    <Image src={url} alt={`${outfit.user_name}'s ${slot.label.toLowerCase()}`} fill sizes={`${size}px`} className="object-contain" />
                    {shoppable && <ShopLink outfitId={outfit.id} column={slot.column} label={slot.label} />}
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
            <OutfitImages outfit={outfit} shoppable={mode === "viewer"} />
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
