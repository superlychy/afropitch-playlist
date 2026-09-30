"use client";

import {
    Home, ListMusic, History, Wallet, Users, MessageSquare, Settings,
    Star, Send, Mail, BarChart3, DollarSign, UserPlus, MoreHorizontal, LogOut, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type PlaylistSubTab = "submissions" | "all";

export interface NavCounts {
    pendingSubmissions: number;
    withdrawals: number;
    openTickets: number;
    applications: number;
}

interface NavItem {
    tab: string;
    playlistTab?: PlaylistSubTab;
    label: string;
    icon: LucideIcon;
    count?: number;
}

const MANAGE_ITEMS: NavItem[] = [
    { tab: "overview", label: "Overview", icon: Home },
    { tab: "playlists", playlistTab: "submissions", label: "Playlists", icon: ListMusic, count: 0 }, // count wired below (pending queue count)
    { tab: "mixing", label: "Mixing orders", icon: Settings },
    { tab: "withdrawals", label: "Withdrawals", icon: Wallet, count: 0 },
    { tab: "users", label: "Users", icon: Users },
    { tab: "support", label: "Support", icon: MessageSquare, count: 0 },
    { tab: "featured", label: "Featured", icon: Star },
    { tab: "broadcast", label: "Broadcast", icon: Send },
    { tab: "inbox", label: "Inbox", icon: Mail },
];

const INSIGHT_ITEMS: NavItem[] = [
    { tab: "analytics", label: "Analytics", icon: BarChart3 },
    { tab: "transactions", label: "Transactions", icon: DollarSign },
    { tab: "applications", label: "Applications", icon: UserPlus, count: 0 },
];

function itemCount(item: NavItem, counts: NavCounts): number {
    if (item.tab === "playlists" && item.playlistTab === "submissions") return counts.pendingSubmissions;
    if (item.tab === "withdrawals") return counts.withdrawals;
    if (item.tab === "support") return counts.openTickets;
    if (item.tab === "applications") return counts.applications;
    return 0;
}

function isActive(
    item: NavItem,
    activeTab: string,
    playlistTab: PlaylistSubTab,
): boolean {
    if (item.tab !== activeTab) return false;
    // "Playlists" is a single merged item: it covers both the review queue
    // (submissions) and the all-playlists inner tabs.
    if (item.tab === "playlists") return true;
    return true;
}

/* ------------------------------------------------------------------ */
/* Desktop sidebar (lg and up)                                         */
/* ------------------------------------------------------------------ */
export function AdminSidebar({
    activeTab,
    playlistTab,
    counts,
    userName,
    onNavigate,
    onLogout,
}: {
    activeTab: string;
    playlistTab: PlaylistSubTab;
    counts: NavCounts;
    userName: string;
    onNavigate: (tab: string, playlistTab?: PlaylistSubTab) => void;
    onLogout: () => void;
}) {
    const initials = (userName || "A").trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
    const renderItem = (item: NavItem) => {
        const Icon = item.icon;
        const active = isActive(item, activeTab, playlistTab);
        const count = itemCount(item, counts);
        return (
            <button
                key={`${item.tab}-${item.playlistTab || ""}-${item.label}`}
                onClick={() => onNavigate(item.tab, item.playlistTab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold mb-0.5 transition-colors ${
                    active ? "bg-green-500/10 text-[#22C55E]" : "text-[#A1A1AA] hover:bg-[#141417] hover:text-white"
                }`}
            >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {count > 0 && (
                    <span className="min-w-[22px] h-[22px] rounded-full bg-red-500 text-white text-[11px] font-extrabold flex items-center justify-center px-1.5">
                        {count}
                    </span>
                )}
            </button>
        );
    };

    return (
        <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[250px] shrink-0 border-r border-white/[0.08] bg-[#0E0E10] flex-col px-3.5 py-5 z-30">
            <div className="flex items-center gap-2.5 px-2 pb-5">
                <div className="w-[38px] h-[38px] rounded-xl bg-gradient-to-br from-[#22C55E] to-[#15803D] flex items-center justify-center font-black text-lg text-[#04120a]">
                    A
                </div>
                <div>
                    <b className="text-[17px] text-white">AfroPitch</b>
                    <small className="block text-[10px] text-[#71717A] font-semibold tracking-wide">ADMIN CONSOLE</small>
                </div>
            </div>

            <div className="text-[10px] tracking-[1.2px] text-[#71717A] font-extrabold px-3 pt-3 pb-1.5">MANAGE</div>
            <nav>{MANAGE_ITEMS.map(renderItem)}</nav>
            <div className="text-[10px] tracking-[1.2px] text-[#71717A] font-extrabold px-3 pt-3 pb-1.5">INSIGHT</div>
            <nav>{INSIGHT_ITEMS.map(renderItem)}</nav>

            <div className="mt-auto border-t border-white/[0.08] pt-3.5 flex items-center gap-2.5 px-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#22C55E] to-[#F59E0B] flex items-center justify-center font-extrabold text-[15px] text-[#04120a] shrink-0">
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <b className="text-sm text-white block truncate">{userName || "Admin"}</b>
                    <button onClick={onLogout} className="text-[11px] text-[#71717A] hover:text-red-400 flex items-center gap-1">
                        <LogOut className="w-3 h-3" /> Sign out
                    </button>
                </div>
            </div>
        </aside>
    );
}

/* ------------------------------------------------------------------ */
/* Mobile bottom tab bar                                               */
/* ------------------------------------------------------------------ */
export function AdminBottomNav({
    activeTab,
    playlistTab,
    counts,
    onNavigate,
    onOpenMore,
}: {
    activeTab: string;
    playlistTab: PlaylistSubTab;
    counts: NavCounts;
    onNavigate: (tab: string, playlistTab?: PlaylistSubTab) => void;
    onOpenMore: () => void;
}) {
    const items: (NavItem & { more?: boolean })[] = [
        { tab: "overview", label: "Home", icon: Home },
        { tab: "playlists", playlistTab: "submissions", label: "Playlists", icon: ListMusic },
        { tab: "support", label: "Support", icon: MessageSquare },
    ];
    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0E0E10]/95 backdrop-blur border-t border-white/[0.08] flex px-1.5 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))]">
            {items.map(item => {
                const Icon = item.icon;
                const active = isActive(item, activeTab, playlistTab);
                const count = itemCount(item, counts);
                return (
                    <button
                        key={item.label}
                        onClick={() => onNavigate(item.tab, item.playlistTab)}
                        className={`flex-1 flex flex-col items-center gap-[3px] text-[10px] font-semibold relative ${
                            active ? "text-[#22C55E]" : "text-[#71717A]"
                        }`}
                    >
                        <Icon className="w-[22px] h-[22px]" />
                        {item.label}
                        {count > 0 && (
                            <span className="absolute top-[-4px] right-[calc(50%-20px)] min-w-[17px] h-[17px] rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center px-1">
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
            <button
                onClick={onOpenMore}
                className="flex-1 flex flex-col items-center gap-[3px] text-[10px] font-semibold text-[#71717A]"
            >
                <MoreHorizontal className="w-[22px] h-[22px]" />
                More
            </button>
        </nav>
    );
}

/* ------------------------------------------------------------------ */
/* "More" sheet: every remaining destination, mobile + desktop fallback */
/* ------------------------------------------------------------------ */
const MORE_ITEMS: NavItem[] = [
    { tab: "overview", label: "Overview", icon: Home },
    { tab: "playlists", playlistTab: "submissions", label: "Playlists", icon: ListMusic }, // merged: opens on the review queue tab, covers all playlists too
    { tab: "submissions", label: "Submission history", icon: History },
    { tab: "withdrawals", label: "Withdrawals", icon: Wallet },
    { tab: "users", label: "Users", icon: Users },
    { tab: "support", label: "Support tickets", icon: MessageSquare },
    { tab: "mixing", label: "Mixing orders", icon: Settings },
    { tab: "featured", label: "Featured", icon: Star },
    { tab: "broadcast", label: "Broadcast", icon: Send },
    { tab: "inbox", label: "Inbox", icon: Mail },
    { tab: "analytics", label: "Analytics", icon: BarChart3 },
    { tab: "transactions", label: "Transactions", icon: DollarSign },
    { tab: "applications", label: "Applications", icon: UserPlus },
];

export function AdminMoreSheet({
    open,
    counts,
    activeTab,
    playlistTab,
    onNavigate,
    onClose,
    onTestWebhook,
    onLogout,
}: {
    open: boolean;
    counts: NavCounts;
    activeTab: string;
    playlistTab: PlaylistSubTab;
    onNavigate: (tab: string, playlistTab?: PlaylistSubTab) => void;
    onClose: () => void;
    onTestWebhook: () => void;
    onLogout: () => void;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div
                className="absolute bottom-0 left-0 right-0 bg-[#141417] border-t border-white/[0.08] rounded-t-3xl p-5 pb-[calc(20px+env(safe-area-inset-bottom))] max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-extrabold text-white">All sections</h3>
                    <button onClick={onClose} aria-label="Close" className="text-[#71717A] hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {MORE_ITEMS.map(item => {
                        const Icon = item.icon;
                        const active = isActive(item, activeTab, playlistTab);
                        const count = itemCount(item, counts);
                        return (
                            <button
                                key={`${item.tab}-${item.playlistTab || ""}-${item.label}`}
                                onClick={() => { onNavigate(item.tab, item.playlistTab); onClose(); }}
                                className={`flex items-center gap-3 p-3 rounded-xl border text-left ${
                                    active
                                        ? "border-green-500/40 bg-green-500/10 text-white"
                                        : "border-white/[0.08] bg-[#1B1B1F] text-[#A1A1AA]"
                                }`}
                            >
                                <Icon className={`w-5 h-5 shrink-0 ${active ? "text-[#22C55E]" : ""}`} />
                                <span className="flex-1 text-sm font-bold truncate">{item.label}</span>
                                {count > 0 && (
                                    <span className="min-w-[20px] h-5 rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center px-1.5">
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={() => { onTestWebhook(); onClose(); }}
                        className="flex-1 py-3 rounded-xl border border-green-500/20 text-green-500 text-sm font-bold"
                    >
                        Test webhook
                    </button>
                    <button
                        onClick={onLogout}
                        className="flex-1 py-3 rounded-xl border border-red-500/20 text-red-400 text-sm font-bold flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-4 h-4" /> Sign out
                    </button>
                </div>
            </div>
        </div>
    );
}
