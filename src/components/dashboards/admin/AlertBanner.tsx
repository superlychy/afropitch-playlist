import type { LucideIcon } from "lucide-react";

/** Amber alert banner (withdrawals, curator applications) per the admin mockup. */
export function AlertBanner({
    icon: Icon,
    title,
    subtitle,
    actionLabel,
    onAction,
}: {
    icon: LucideIcon;
    title: string;
    subtitle: string;
    actionLabel: string;
    onAction: () => void;
}) {
    return (
        <div className="rounded-2xl border border-amber-500/35 bg-gradient-to-br from-[#3B2F0B] to-[#1A1405] p-3.5 flex items-center gap-3 mb-2.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                <Icon className="w-[22px] h-[22px] text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white">{title}</h3>
                <p className="text-xs text-[#A1A1AA] truncate">{subtitle}</p>
            </div>
            <button
                onClick={onAction}
                className="bg-amber-400 border-none text-[#231303] font-extrabold text-xs rounded-[10px] px-3.5 py-2.5 shrink-0"
            >
                {actionLabel}
            </button>
        </div>
    );
}
