import {josefinSans} from "@/app/ui/fonts";
import Logo from "@/app/FitPickAI.svg";
import Image from "next/image";

export default function FitPickAILogo() {
    return (
        <div className={`${josefinSans.className} flex flex-col items-center gap-4 leading-none`}>
            <Image src={Logo} alt="FitPickAI Logo" width={200} height={200} className="w-24 h-24 md:w-32 md:h-32"/>
            <p className="text-6xl md:text-8xl tracking-[0.2em] uppercase" style={{ fontWeight: 300 }}>
                <span className="text-[#FFCECE]">FITPICK</span><span className="text-white">AI</span>
            </p>
        </div>
    )
}
