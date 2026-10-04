import {Metadata} from "next";
import {montserrat} from "@/app/ui/fonts";
import {fetchOotdCandidates} from "@/app/lib/data";
import OotdPicker from "@/app/ui/ootd/ootd-picker";

export const metadata: Metadata = {
    title: "Outfit of the Day"
};

export default async function OotdPage() {
    const outfits = await fetchOotdCandidates();
    return (
        <main>
            <h1 className={`${montserrat.className} mb-2 text-xl md:text-2xl`}>Outfit of the Day</h1>
            <p className="mb-6 text-sm text-gray-500">
                Swipe through what&apos;s in rotation, or let FitPickAI choose. Higher-rated fits come up more often.
            </p>
            <OotdPicker outfits={outfits} />
        </main>
    );
}
