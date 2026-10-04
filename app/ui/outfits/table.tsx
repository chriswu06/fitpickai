import Link from "next/link";
import {fetchFilteredOutfits} from "@/app/lib/data";
import OutfitCard from "@/app/ui/outfits/outfit-card";

export default async function OutfitsTable({
    query,
    currentPage
}: {
    query: string;
    currentPage: number;
}) {
    const outfits = await fetchFilteredOutfits(query, currentPage);
    if (outfits.length === 0) {
        return (
            <div className="mt-6 rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500">
                {query ? (
                    <>No outfits match &ldquo;{query}&rdquo;.</>
                ) : (
                    <>
                        You haven&apos;t added any outfits yet.{" "}
                        <Link href="/dashboard/outfits/create" className="text-blue-600 hover:underline">Create your first one.</Link>
                    </>
                )}
            </div>
        );
    }
    return (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {outfits.map(outfit => (
                <OutfitCard key={outfit.id} outfit={outfit} mode="owner" />
            ))}
        </div>
    );
}
