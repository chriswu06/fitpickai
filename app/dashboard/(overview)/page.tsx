import {Suspense} from "react";
import {Metadata} from "next";
import {montserrat} from "@/app/ui/fonts";
import CardWrapper from "@/app/ui/dashboard/cards";
import PersonalRatingsChart, {FriendRatingsChart} from "@/app/ui/dashboard/personal-rating-chart";
import LatestOutfits from "@/app/ui/dashboard/latest-outfits";
import {CardsSkeleton, RatingsChartSkeleton, LatestOutfitsSkeleton} from "@/app/ui/skeletons";

export const metadata: Metadata = {
    title: "Dashboard"
};

export default function DashboardPage() {
    return (
        <main>
            <h1 className={`${montserrat.className} mb-4 text-xl md:text-2xl`}>Dashboard</h1>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Suspense fallback={<CardsSkeleton />}>
                    <CardWrapper />
                </Suspense>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8">
                <Suspense fallback={<RatingsChartSkeleton />}>
                    <PersonalRatingsChart />
                </Suspense>
                <Suspense fallback={<LatestOutfitsSkeleton />}>
                    <LatestOutfits />
                </Suspense>
                <Suspense fallback={<RatingsChartSkeleton />}>
                    <FriendRatingsChart />
                </Suspense>
            </div>
        </main>
    );
}
