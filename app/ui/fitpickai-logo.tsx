import {josefinSans} from "@/app/ui/fonts";
import Logo from "@/app/FitPickAI.svg";
import Image from "next/image";
import clsx from "clsx";

// "hero" is the large stacked landing-page logo; "compact" fits headers like the sidenav and auth pages.
export default function FitPickAILogo({variant = "compact"}: {variant?: "hero" | "compact"}) {
    const hero = variant === "hero";
    return (
        <div className={clsx(josefinSans.className, "flex leading-none", hero ? "flex-col items-center gap-4" : "flex-row items-center gap-2")}>
            <Image
                src={Logo}
                alt="FitPickAI Logo"
                width={200}
                height={200}
                className={hero ? "h-20 w-20 sm:h-24 sm:w-24 md:h-32 md:w-32" : "h-10 w-10 md:h-12 md:w-12"}
            />
            <p
                className={clsx(
                    "whitespace-nowrap uppercase",
                    hero ? "text-4xl tracking-[0.15em] sm:text-6xl sm:tracking-[0.2em] md:text-8xl" : "text-xl tracking-[0.1em] md:text-2xl",
                )}
                style={{fontWeight: 300}}
            >
                <span className="text-[#FFCECE]">FITPICK</span><span className="text-white">AI</span>
            </p>
        </div>
    )
}
