import { formatCompact } from "./utils";

/** Playlist row per the admin mockup: initial tile, name, meta, song count. */
export function PlaylistRow({
    name,
    type,
    followers,
    songs,
    onClick,
}: {
    name: string;
    type: string;
    followers: number;
    songs?: number;
    onClick?: () => void;
}) {
    const paid = (type || "").toLowerCase() !== "free";
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 bg-[#141417] border border-white/[0.08] rounded-[14px] p-3 text-left"
        >
            <div className="w-[42px] h-[42px] rounded-[10px] bg-green-500/10 flex items-center justify-center shrink-0 text-lg font-extrabold text-[#22C55E]">
                {(name || "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{name}</h3>
                <p className="text-[11px] text-[#71717A]">
                    {paid ? "Paid" : "Free"} &middot; {formatCompact(followers)} followers
                </p>
            </div>
            {typeof songs === "number" && (
                <div className="text-[13px] font-extrabold text-[#22C55E] shrink-0">{songs} songs</div>
            )}
        </button>
    );
}
