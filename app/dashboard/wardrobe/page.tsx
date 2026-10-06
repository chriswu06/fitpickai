import {Metadata} from "next";
import {after} from "next/server";
import {requireUserId} from "@/app/lib/session";
import {tagUntaggedGarments} from "@/app/lib/closet";
import {montserrat} from "@/app/ui/fonts";
import {fetchWardrobe} from "@/app/lib/data";
import Closet from "@/app/ui/wardrobe/closet";

export const metadata: Metadata = {
    title: "Wardrobe"
};

export default async function WardrobePage() {
    const wardrobe = await fetchWardrobe();
    // Catch up on tagging older photos so the AI features know this closet.
    const userId = await requireUserId();
    after(() => tagUntaggedGarments(userId).catch(e => console.error("Tagging Error: ", e)));
    return (
        <main>
            <h1 className={`${montserrat.className} mb-2 text-xl md:text-2xl`}>Wardrobe</h1>
            <p className="mb-6 text-sm text-gray-500">
                Every piece from your outfits. Swipe each rail to mix and match, then save the combos you like.
            </p>
            <Closet wardrobe={wardrobe} />
        </main>
    );
}
