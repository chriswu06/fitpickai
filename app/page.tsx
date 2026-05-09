import FadingFitPickAILogo from "@/app/ui/fitpickai-fading-logo";
import {montserrat, inter} from "@/app/ui/fonts"
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import Image from "next/image";
import {mainCardData} from "@/app/lib/data";
import { CountingNumber } from '@/components/ui/shadcn-io/counting-number';
import { ColourfulText } from "@/components/ui/shadcn-io/colourful-text";
import {Suspense} from "react";

async function AnimatedNumOutfits() {
    const {numberOfOutfits} = await mainCardData();
    return <CountingNumber number={numberOfOutfits} className="text-4xl" />
}
async function AnimatedNumUsers() {
    const {numberOfUsers} = await mainCardData();
    return <CountingNumber number={numberOfUsers} className="text-4xl" />
}

export default function Page() {
    return (
        <main className = "flex flex-col p-6 min-h-[200vh]">
            <FadingFitPickAILogo/>
            <br/>
            <div className="mt-4 flex grow flex-col gap-4 md:flex-row">
                <div className="flex flex-col justify-center gap-6 rounded-lg bg-gray-50 px-6 py-10 md:w-2/5 md:px-20">
                <div className="relative w-0 h-0 border-l-[15px] border-r-[15px] border-b-[26px] border-l-transparent border-r-transparent border-b-black" />
                <p className={`${montserrat.className} text-xl text-gray-800 md:text-3xl md:leading-normal`}>
                    <strong>Feel Freshly Fitted.</strong>
                    Your online, AI-Powered outfit creator tailored to your wardrobe and 
                    <ColourfulText
                        text="vibe"
                        interval={3000}
                        animationDuration={0.7}
                        colors={["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7"]}
                    />;.
                </p>
                <div className="flex items-center justify-center p-8">
                <h1 className={`${inter.className}text-4xl md:text-6xl font-bold text-center`}>
                    <Suspense fallback = {<p>...</p>}>
                        <AnimatedNumOutfits/>
                    </Suspense>
                    <br />
                    outfits created.
                </h1>
                <h1 className={`${inter.className}text-4xl md:text-6xl font-bold text-center`}>
                    <Suspense fallback = {<p>...</p>}>
                        <AnimatedNumUsers/>
                    </Suspense>
                    <br />
                    styled members.
                </h1>
                </div>
                <Link href="/login" className="flex items-center gap-5 self-start rounded-lg bg-blue-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-400 md:text-base">
                    <span>Log in</span> <ArrowRightIcon className="w-5 md:w-6" />
                </Link>
                <Link href="/register" className="flex items-center gap-5 self-start rounded-lg bg-blue-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-400 md:text-base">
                    <span>Register</span> <ArrowRightIcon className="w-5 md:w-6" />
                </Link>
                </div>
                <div className="flex items-center justify-center p-6 md:w-3/5 md:px-28 md:py-12">
                <Image
                    src="/hero-desktop.png"
                    width={1000}
                    height={760}
                    className="hidden md:block"
                    alt="Screenshots of FitPickAI showing desktop version"
                />
                <Image
                    src="/hero-mobile.png"
                    width={560}
                    height={620}
                    className="block md: hidden"
                    alt="Screenshot of FitPickAI showing mobile version"
                />
                </div>
            </div>
        </main>
    );
}
