import {Metadata} from "next";
import {montserrat} from "@/app/ui/fonts";
import {fetchWardrobe} from "@/app/lib/data";
import TryOnStudio, {TryOnGarment} from "@/app/ui/try-on/try-on-studio";

export const metadata: Metadata = {
    title: "Try on"
};

// Leffa can render tops and bottoms only, so shoes and accessories are left out.
const REGIONS = {
    shirt_image_url: "upper",
    pants_image_url: "lower",
} as const;

export default async function TryOnPage() {
    const wardrobe = await fetchWardrobe();
    const garments: TryOnGarment[] = wardrobe.slots.flatMap(slot => {
        const region = REGIONS[slot.column as keyof typeof REGIONS];
        return region ? slot.items.map(item => ({url: item.url, label: slot.label, region})) : [];
    });
    return (
        <main>
            <h1 className={`${montserrat.className} mb-2 text-xl md:text-2xl`}>Try on</h1>
            <p className="mb-6 text-sm text-gray-500">
                Upload a full-body photo, pick a shirt or pants from your wardrobe, and see yourself wearing it.
            </p>
            <TryOnStudio garments={garments} />
            <p className="mt-8 text-center text-xs text-gray-400">
                Try-on by{" "}
                <a href="https://huggingface.co/spaces/franciszzj/Leffa" target="_blank" rel="noopener noreferrer" className="hover:underline">Leffa</a>{" "}
                (MIT), via Hugging Face.
            </p>
        </main>
    );
}
