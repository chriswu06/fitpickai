"use client";

import { motion } from "motion/react";

export default function AuroraBackground() {
    return (
        <div className="absolute inset-0 -z-10 overflow-hidden bg-zinc-950">
            {/* Rose glow */}
            <motion.div
                className="absolute -top-40 left-1/4 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-rose-500/25 blur-[120px]"
                animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Fuchsia glow */}
            <motion.div
                className="absolute top-1/3 right-1/4 h-[32rem] w-[32rem] translate-x-1/2 rounded-full bg-fuchsia-500/15 blur-[120px]"
                animate={{ x: [0, -50, 0], y: [0, 60, 0] }}
                transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Soft pink glow */}
            <motion.div
                className="absolute bottom-0 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-pink-400/10 blur-[120px]"
                animate={{ x: [0, 40, 0], y: [0, -40, 0] }}
                transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Vignette so foreground content stays legible */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(9,9,11,0.9)_100%)]" />
        </div>
    );
}
