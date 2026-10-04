import Link from "next/link";
import {ArrowPathIcon} from "@heroicons/react/24/outline";
import {montserrat} from "@/app/ui/fonts";
import {fetchFeedOutfits} from "@/app/lib/data";
import OutfitCard from "@/app/ui/outfits/outfit-card";

// Latest outfits from people you follow, with a control to rate each one.
export default async function LatestOutfits() {
    const latestOutfits = await fetchFeedOutfits(5);
    return (
        <div className="flex w-full flex-col md:col-span-4">
            <h2 className={`${montserrat.className} mb-4 text-xl md:text-2xl`}>
                Friends&apos; Latest Fits
            </h2>
            <div className="flex grow flex-col gap-4 rounded-xl bg-gray-100 p-4">
                {latestOutfits.length === 0 ? (
                    <p className="py-12 text-center text-sm text-gray-500">
                        Nothing here yet.{" "}
                        <Link href="/dashboard/connect" className="text-blue-600 hover:underline">Follow some people</Link>{" "}
                        to see and rate their outfits.
                    </p>
                ) : (
                    latestOutfits.map(outfit => (
                        <OutfitCard key={outfit.id} outfit={outfit} mode="viewer" showOwner />
                    ))
                )}
                <div className="flex items-center pt-2">
                    <ArrowPathIcon className="h-5 w-5 text-gray-500" />
                    <h3 className="ml-2 text-sm text-gray-500">Updated just now</h3>
                </div>
            </div>
        </div>
    );
}
