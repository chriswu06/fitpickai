import {
    BookmarkIcon,
    ArrowPathIcon,
    StarIcon,
    UserGroupIcon,
} from "@heroicons/react/24/outline";
import {montserrat} from "@/app/ui/fonts";
import {fetchDashboardCards} from "@/app/lib/data";

const iconMap = {
    outfits: BookmarkIcon,
    rotation: ArrowPathIcon,
    rating: StarIcon,
    social: UserGroupIcon,
};

const formatRating = (value: number | null) => (value === null ? "—" : `${value.toFixed(1)}/10`);

export default async function CardWrapper() {
    const cards = await fetchDashboardCards();
    return (
        <>
            <Card title="Outfits" value={cards.totalOutfits} subtitle={`${cards.inRotation} in rotation`} type="outfits" />
            <Card title="Your Avg Rating" value={formatRating(cards.avgSelfRating)} subtitle="Self-rated" type="rating" />
            <Card title="Friends' Avg Rating" value={formatRating(cards.avgFriendRating)} subtitle="Ratings from others" type="rotation" />
            <Card title="Followers" value={cards.followers} subtitle={`Following ${cards.following}`} type="social" />
        </>
    );
}

export function Card({
    title,
    value,
    subtitle,
    type,
}: {
    title: string;
    value: number | string;
    subtitle?: string;
    type: keyof typeof iconMap;
}) {
    const Icon = iconMap[type];
    return (
        <div className="rounded-xl bg-gray-50 p-2 shadow-sm">
            <div className="flex p-4">
                <Icon className="h-5 w-5 text-gray-700" />
                <h3 className="ml-2 text-sm font-medium">{title}</h3>
            </div>
            <div className="flex flex-col items-center justify-center truncate rounded-xl bg-white px-4 py-6">
                <p className={`${montserrat.className} text-2xl`}>{value}</p>
                {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
            </div>
        </div>
    );
}
