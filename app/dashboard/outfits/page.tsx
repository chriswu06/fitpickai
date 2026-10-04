import { Suspense } from "react";
import Search from "@/app/ui/search";
import OutfitsTable from "@/app/ui/outfits/table";
import { CreateOutfit } from "@/app/ui/outfits/buttons";
import Pagination from "@/app/ui/outfits/pagination";
import { OutfitsTableSkeleton } from "@/app/ui/skeletons";
import { fetchOutfitsPages } from "@/app/lib/data";

export default async function OutfitsPage({
    searchParams,
}: {
    searchParams?: Promise<{ query?: string; page?: string }>;
}) {
    const params = await searchParams;
    const query = params?.query || "";
    const currentPage = Number(params?.page) || 1;
    const totalPages = await fetchOutfitsPages(query);

    return (
        <div className="w-full">
            <div className="flex w-full items-center justify-between">
                <h1 className="text-2xl">My Outfits</h1>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
                <Suspense fallback={null}>
                    <Search placeholder="Search outfits..." />
                </Suspense>
                <CreateOutfit />
            </div>
            <Suspense key={query + currentPage} fallback={<OutfitsTableSkeleton />}>
                <OutfitsTable query={query} currentPage={currentPage} />
            </Suspense>
            <div className="mt-5 flex w-full justify-center">
                <Suspense fallback={null}>
                    <Pagination totalPages={totalPages} />
                </Suspense>
            </div>
        </div>
    );
}
