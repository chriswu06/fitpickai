import {montserrat} from "@/app/ui/fonts";
import {fetchFriendRatingsTrend, fetchPersonalRatings} from "@/app/lib/data";
import {PersonalRatingsTrend} from "@/app/lib/definitions";
import RatingsChartCanvas from "@/app/ui/dashboard/ratings-chart-canvas";

function RatingsChart({title, ratings, emptyMessage}: {title: string; ratings: PersonalRatingsTrend[]; emptyMessage: string}) {
    return (
        <div className="w-full md:col-span-4">
            <h2 className={`${montserrat.className} mb-4 text-xl md:text-2xl`}>{title}</h2>
            <div className="rounded-xl bg-gray-50 p-4">
                {ratings.length === 0 ? (
                    <p className="flex h-[400px] items-center justify-center text-center text-sm text-gray-400">{emptyMessage}</p>
                ) : (
                    <RatingsChartCanvas data={ratings} />
                )}
            </div>
        </div>
    );
}

export default async function PersonalRatingsChart() {
    const ratings = await fetchPersonalRatings();
    return (
        <RatingsChart
            title="Your Rating Trends"
            ratings={ratings}
            emptyMessage="Rate your outfits to see how your opinions change over time."
        />
    );
}

export async function FriendRatingsChart() {
    const ratings = await fetchFriendRatingsTrend();
    return (
        <RatingsChart
            title="Friends' Rating Trends"
            ratings={ratings}
            emptyMessage="When friends rate your outfits, their average rating over time shows up here."
        />
    );
}
