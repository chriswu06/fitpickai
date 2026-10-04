import FadingFitPickAILogo from "@/app/ui/fitpickai-fading-logo";
import AuroraBackground from "@/app/ui/aurora-background";
import AppPreview from "@/app/ui/app-preview";
import { montserrat } from "@/app/ui/fonts";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { mainCardData } from "@/app/lib/data";
import { CountingNumber } from "@/components/ui/shadcn-io/counting-number";
import { ColourfulText } from "@/components/ui/shadcn-io/colourful-text";
import { Suspense } from "react";

async function AnimatedNumOutfits() {
    let numberOfOutfits = 0;
    try {
        ({ numberOfOutfits } = await mainCardData());
    } catch {
        numberOfOutfits = 0;
    }
    return <CountingNumber number={numberOfOutfits} className="text-5xl font-bold text-white" />;
}
async function AnimatedNumUsers() {
    let numberOfUsers = 0;
    try {
        ({ numberOfUsers } = await mainCardData());
    } catch {
        numberOfUsers = 0;
    }
    return <CountingNumber number={numberOfUsers} className="text-5xl font-bold text-white" />;
}

export default function Page() {
    return (
        <main className="relative flex flex-col min-h-screen bg-zinc-950 text-white">
            <AuroraBackground />

            {/* Hero */}
            <section className="flex flex-col items-center justify-center gap-10 px-6 pt-28 pb-16 text-center">
                <FadingFitPickAILogo />
                <p className={`${montserrat.className} text-base md:text-lg text-zinc-400 max-w-md tracking-wide`}>
                    Your AI-powered outfit creator, tailored to your wardrobe.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Link href="/register" className={buttonVariants({ variant: "primary", size: "lg" })}>
                        Get started <ArrowRightIcon className="w-4" />
                    </Link>
                    <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                        Log in
                    </Link>
                </div>
            </section>

            {/* Stats */}
            <section className="flex flex-col sm:flex-row justify-center gap-6 px-6 py-12">
                <div className="flex flex-1 sm:max-w-xs flex-col items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-8 py-8 backdrop-blur">
                    <Suspense fallback={<p className="text-5xl font-bold text-white">—</p>}>
                        <AnimatedNumOutfits />
                    </Suspense>
                    <p className={`${montserrat.className} text-xs tracking-widest uppercase text-rose-300/80`}>
                        outfits created
                    </p>
                </div>
                <div className="flex flex-1 sm:max-w-xs flex-col items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-8 py-8 backdrop-blur">
                    <Suspense fallback={<p className="text-5xl font-bold text-white">—</p>}>
                        <AnimatedNumUsers />
                    </Suspense>
                    <p className={`${montserrat.className} text-xs tracking-widest uppercase text-rose-300/80`}>
                        styled members
                    </p>
                </div>
            </section>

            {/* Tagline */}
            <section className="flex flex-col items-center gap-6 py-16 px-6 text-center">
                <p className={`${montserrat.className} text-2xl md:text-4xl`}>
                    <ColourfulText
                        text="Feel fitted, always."
                        interval={3000}
                        animationDuration={0.7}
                        colors={["#fb7185", "#a78bfa", "#38bdf8", "#34d399", "#fbbf24"]}
                    />
                </p>
            </section>

            {/* Hero image preview */}
            <section className="flex justify-center px-6 pb-24 pt-4">
                <AppPreview />
            </section>

        </main>
    );
}
