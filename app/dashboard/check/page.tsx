import {Metadata} from "next";
import {montserrat} from "@/app/ui/fonts";
import BuyCheck from "@/app/ui/check/buy-check";

export const metadata: Metadata = {
    title: "Should I Buy It?"
};

export default function CheckPage() {
    return (
        <main>
            <h1 className={`${montserrat.className} mb-2 text-xl md:text-2xl`}>Should I buy it?</h1>
            <p className="mb-6 text-sm text-gray-500">
                Paste a shop link or snap the item in the store. FitPickAI checks it against your closet, this week&apos;s weather and your plans.
            </p>
            <BuyCheck amazonTag={process.env.AMAZON_ASSOCIATE_TAG ?? null} />
        </main>
    );
}
