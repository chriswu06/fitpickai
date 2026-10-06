export default function AppPreview() {
    return (
        <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-2xl shadow-black/60 backdrop-blur">
            {/* Fake window chrome */}
            <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-rose-400/80" />
                <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
                <span className="ml-4 h-5 flex-1 rounded-full bg-zinc-800/70" />
            </div>
            {/* Placeholder canvas */}
            <div className="relative flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-rose-500/10 via-zinc-900 to-fuchsia-500/10">
                {/* Shimmer sweep */}
                <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                <div className="flex flex-col items-center gap-2 text-center">
                    <span className="text-sm font-medium uppercase tracking-widest text-zinc-500">
                        Preview coming soon
                    </span>
                    <span className="text-xs text-zinc-600">Your styled fits, front and center.</span>
                </div>
            </div>
        </div>
    );
}
