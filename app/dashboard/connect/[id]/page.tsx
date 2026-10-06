import {Metadata} from "next";
import {notFound} from "next/navigation";
import {montserrat} from "@/app/ui/fonts";
import {fetchUserProfile} from "@/app/lib/data";
import Breadcrumbs from "@/app/ui/outfits/breadcrumbs";
import FollowButton from "@/app/ui/users/follow-button";
import OutfitCard from "@/app/ui/outfits/outfit-card";

export const metadata: Metadata = {
    title: "Profile"
};

export default async function ProfilePage({params}: {params: Promise<{id: string}>}) {
    const {id} = await params;
    const profile = await fetchUserProfile(id);
    if (!profile) notFound();
    const {user, outfits, isSelf} = profile;

    return (
        <main>
            <Breadcrumbs
                breadcrumbs={[
                    {label: "Connect", href: "/dashboard/connect"},
                    {label: user.name, href: `/dashboard/connect/${id}`, active: true},
                ]}
            />
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gray-50 p-4">
                <div>
                    <h1 className={`${montserrat.className} text-xl md:text-2xl`}>{user.name}</h1>
                    <p className="text-sm text-gray-500">
                        {user.total_outfits} outfits · {user.total_in_rotation} in rotation
                        {user.avg_self_rating !== null && <> · rates themselves {user.avg_self_rating}/10 on average</>}
                    </p>
                </div>
                {!isSelf && <FollowButton userId={user.id} isFollowing={user.is_following} />}
            </div>
            {outfits.length === 0 ? (
                <p className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500">No outfits yet.</p>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {outfits.map(outfit => (
                        <OutfitCard key={outfit.id} outfit={outfit} mode={isSelf ? "plain" : "viewer"} />
                    ))}
                </div>
            )}
        </main>
    );
}
