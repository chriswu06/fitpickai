import {montserrat} from "@/app/ui/fonts";
import {fetchPersonalRatings} from "@/app/lib/data";
import RatingsChartCanvas from "@/app/ui/dashboard/ratings-chart-canvas";

export default async function PersonalRatingsChart() {
    const ratings = await fetchPersonalRatings();
    return (
        <div className="w-full md:col-span-4">
            <h2 className={`${montserrat.className} mb-4 text-xl md:text-2xl`}>
                Your Rating Trends
            </h2>
            <div className="rounded-xl bg-gray-50 p-4">
                {ratings.length === 0 ? (
                    <p className="flex h-[400px] items-center justify-center text-sm text-gray-400">
                        Rate your outfits to see how your opinions change over time.
                    </p>
                ) : (
                    <RatingsChartCanvas data={ratings} />
                )}
            </div>
        </div>
    );
}
