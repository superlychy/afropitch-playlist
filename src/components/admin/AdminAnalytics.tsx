"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BarChart3, TrendingUp, UserPlus, ListMusic, Trophy } from "lucide-react";

const DAYS = 14;

type DayBucket = { key: string; label: string; submissions: number; revenue: number; artists: number; curators: number };

function dayKeys(days: number): { key: string; label: string }[] {
    const out: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        out.push({ key, label: d.toLocaleDateString("en-US", { day: "numeric", month: "short" }) });
    }
    return out;
}

function BarChart({ buckets, getValue, color, format }: { buckets: DayBucket[]; getValue: (b: DayBucket) => number; color: string; format: (v: number) => string }) {
    const W = 560, H = 170, PAD = 28;
    const max = Math.max(1, ...buckets.map(getValue));
    const bw = (W - PAD * 2) / buckets.length;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
            {[0.25, 0.5, 0.75, 1].map((f) => (
                <g key={f}>
                    <line x1={PAD} x2={W - 8} y1={H - PAD - (H - PAD * 2) * f} y2={H - PAD - (H - PAD * 2) * f} stroke="#ffffff" strokeOpacity="0.06" />
                    <text x={PAD - 5} y={H - PAD - (H - PAD * 2) * f + 3} fill="#71717A" fontSize="9" textAnchor="end">{format(Math.round(max * f))}</text>
                </g>
            ))}
            {buckets.map((b, i) => {
                const v = getValue(b);
                const h = Math.max(2, ((H - PAD * 2) * v) / max);
                const x = PAD + i * bw + bw * 0.22;
                const isToday = i === buckets.length - 1;
                return (
                    <g key={b.key}>
                        <rect x={x} y={H - PAD - h} width={bw * 0.56} height={h} rx={3} fill={color} fillOpacity={isToday ? 1 : 0.55}>
                            <title>{b.label}: {format(v)}</title>
                        </rect>
                        {(i % 2 === 0 || isToday) && (
                            <text x={x + bw * 0.28} y={H - PAD + 13} fill="#71717A" fontSize="9" textAnchor="middle">{b.label}</text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

function AreaChart({ buckets, color }: { buckets: DayBucket[]; color: string }) {
    const W = 560, H = 170, PAD = 28;
    const max = Math.max(1, ...buckets.map((b) => b.revenue));
    const stepX = (W - PAD * 2) / Math.max(1, buckets.length - 1);
    const pts = buckets.map((b, i) => [PAD + i * stepX, H - PAD - ((H - PAD * 2) * b.revenue) / max] as const);
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const area = `${line} L${(PAD + (buckets.length - 1) * stepX).toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`;
    const gid = "revGrad";
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
            <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.45" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75, 1].map((f) => (
                <g key={f}>
                    <line x1={PAD} x2={W - 8} y1={H - PAD - (H - PAD * 2) * f} y2={H - PAD - (H - PAD * 2) * f} stroke="#ffffff" strokeOpacity="0.06" />
                    <text x={PAD - 5} y={H - PAD - (H - PAD * 2) * f + 3} fill="#71717A" fontSize="9" textAnchor="end">₦{Math.round(max * f / 1000)}k</text>
                </g>
            ))}
            <path d={area} fill={`url(#${gid})`} />
            <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
            {pts.map((p, i) => (
                <g key={i}>
                    <circle cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4 : 2.5} fill={color} stroke="#0A0A0B" strokeWidth={i === pts.length - 1 ? 2 : 0}>
                        <title>{buckets[i].label}: ₦{buckets[i].revenue.toLocaleString()}</title>
                    </circle>
                    {(i % 3 === 0 || i === pts.length - 1) && (
                        <text x={p[0]} y={H - PAD + 13} fill="#71717A" fontSize="9" textAnchor="middle">{buckets[i].label}</text>
                    )}
                </g>
            ))}
        </svg>
    );
}

function StackedBars({ buckets }: { buckets: DayBucket[] }) {
    const W = 560, H = 170, PAD = 28;
    const max = Math.max(1, ...buckets.map((b) => b.artists + b.curators));
    const bw = (W - PAD * 2) / buckets.length;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
            {[0.25, 0.5, 0.75, 1].map((f) => (
                <g key={f}>
                    <line x1={PAD} x2={W - 8} y1={H - PAD - (H - PAD * 2) * f} y2={H - PAD - (H - PAD * 2) * f} stroke="#ffffff" strokeOpacity="0.06" />
                    <text x={PAD - 5} y={H - PAD - (H - PAD * 2) * f + 3} fill="#71717A" fontSize="9" textAnchor="end">{Math.round(max * f)}</text>
                </g>
            ))}
            {buckets.map((b, i) => {
                const total = b.artists + b.curators;
                const h = Math.max(2, ((H - PAD * 2) * total) / max);
                const ha = total > 0 ? (h * b.artists) / total : 0;
                const x = PAD + i * bw + bw * 0.22;
                const isToday = i === buckets.length - 1;
                return (
                    <g key={b.key}>
                        <rect x={x} y={H - PAD - h} width={bw * 0.56} height={Math.max(0, h - ha)} rx={2} fill="#22C55E" fillOpacity={isToday ? 1 : 0.55}>
                            <title>{b.label}: {b.artists} artists, {b.curators} curators</title>
                        </rect>
                        <rect x={x} y={H - PAD - ha} width={bw * 0.56} height={Math.max(ha, total > 0 && b.artists > 0 ? 2 : 0)} rx={2} fill="#F59E0B" fillOpacity={isToday ? 1 : 0.7}>
                            <title>{b.label}: {b.artists} artists, {b.curators} curators</title>
                        </rect>
                        {(i % 2 === 0 || isToday) && (
                            <text x={x + bw * 0.28} y={H - PAD + 13} fill="#71717A" fontSize="9" textAnchor="middle">{b.label}</text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

export function AdminAnalytics({ topPlaylists, topSongs }: { topPlaylists: any[]; topSongs: any[] }) {
    const [buckets, setBuckets] = useState<DayBucket[]>([]);
    const [loading, setLoading] = useState(true);
    const [totals, setTotals] = useState({ subs: 0, revenue: 0, artists: 0, curators: 0 });

    useEffect(() => {
        const load = async () => {
            const keys = dayKeys(DAYS);
            const map = new Map(keys.map((k) => [k.key, { ...k, submissions: 0, revenue: 0, artists: 0, curators: 0 }]));
            const since = keys[0].key;
            const [{ data: subs }, { data: profs }] = await Promise.all([
                supabase.from("submissions").select("created_at, status, amount_paid").gte("created_at", since).limit(3000),
                supabase.from("profiles").select("created_at, role").gte("created_at", since).limit(3000),
            ]);
            let tSubs = 0, tRev = 0, tArt = 0, tCur = 0;
            (subs || []).forEach((s: any) => {
                const k = String(s.created_at).slice(0, 10);
                const b = map.get(k);
                if (!b) return;
                b.submissions += 1;
                tSubs += 1;
                if (s.status !== "declined" && s.status !== "rejected") {
                    const amt = Number(s.amount_paid || 0);
                    b.revenue += amt;
                    tRev += amt;
                }
            });
            (profs || []).forEach((p: any) => {
                const k = String(p.created_at).slice(0, 10);
                const b = map.get(k);
                if (!b) return;
                if (p.role === "artist") { b.artists += 1; tArt += 1; }
                else if (p.role === "curator") { b.curators += 1; tCur += 1; }
            });
            setBuckets(keys.map((k) => map.get(k.key)!));
            setTotals({ subs: tSubs, revenue: tRev, artists: tArt, curators: tCur });
            setLoading(false);
        };
        load();
    }, []);

    const maxClicks = Math.max(1, ...(topPlaylists || []).map((p: any) => Number(p.clicks || p.total_clicks || 0)));

    return (
        <section className="mt-2 lg:mt-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                <BarChart3 className="w-5 h-5 text-green-500" /> Platform analytics
                <span className="text-xs text-gray-500 font-normal ml-1">Last 14 days, live from the database</span>
            </h2>
            <p className="text-xs text-[#71717A] mb-4">How the platform is moving. The raw system log feed is gone, this is what replaces it.</p>

            {loading ? (
                <div className="bg-[#141417] border border-white/[0.08] rounded-[18px] p-10 text-center text-[#71717A] text-sm">Loading charts...</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
                    <div className="bg-[#141417] border border-white/[0.08] rounded-[18px] p-4 lg:p-5">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-extrabold text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-400" /> Submissions</h3>
                            <span className="text-xs text-[#71717A]"><b className="text-white text-sm">{totals.subs}</b> in 14 days</span>
                        </div>
                        <p className="text-xs text-[#71717A] mb-2">Songs pitched per day</p>
                        <BarChart buckets={buckets} getValue={(b) => b.submissions} color="#60A5FA" format={(v) => String(v)} />
                    </div>

                    <div className="bg-[#141417] border border-white/[0.08] rounded-[18px] p-4 lg:p-5">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-extrabold text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-400" /> Revenue</h3>
                            <span className="text-xs text-[#71717A]"><b className="text-white text-sm">₦{totals.revenue.toLocaleString()}</b> in 14 days</span>
                        </div>
                        <p className="text-xs text-[#71717A] mb-2">Submission fees per day (declined excluded)</p>
                        <AreaChart buckets={buckets} color="#22C55E" />
                    </div>

                    <div className="bg-[#141417] border border-white/[0.08] rounded-[18px] p-4 lg:p-5">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-extrabold text-white flex items-center gap-2"><UserPlus className="w-4 h-4 text-amber-400" /> New signups</h3>
                            <span className="text-xs text-[#71717A]"><b className="text-white text-sm">{totals.artists + totals.curators}</b> in 14 days</span>
                        </div>
                        <p className="text-xs text-[#71717A] mb-2 flex items-center gap-3">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B] inline-block" /> Artists ({totals.artists})</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#22C55E] inline-block" /> Curators ({totals.curators})</span>
                        </p>
                        <StackedBars buckets={buckets} />
                    </div>

                    <div className="bg-[#141417] border border-white/[0.08] rounded-[18px] p-4 lg:p-5">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-extrabold text-white flex items-center gap-2"><ListMusic className="w-4 h-4 text-purple-400" /> Playlist clicks</h3>
                        </div>
                        <p className="text-xs text-[#71717A] mb-3">Which playlists fans tap through to most</p>
                        <div className="space-y-3">
                            {(topPlaylists || []).length === 0 && <p className="text-sm text-[#71717A]">No click data yet.</p>}
                            {(topPlaylists || []).slice(0, 6).map((p: any) => {
                                const clicks = Number(p.clicks || p.total_clicks || 0);
                                const name = p.playlist_name || p.name || "Playlist";
                                return (
                                    <div key={p.playlist_id || p.id}>
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-white font-semibold truncate mr-2">{name}</span>
                                            <span className="text-[#71717A] shrink-0">{clicks} clicks</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                                            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${Math.max(3, (clicks / maxClicks) * 100)}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-[#141417] border border-white/[0.08] rounded-[18px] p-4 lg:p-5 lg:col-span-2">
                        <h3 className="text-sm font-extrabold text-white flex items-center gap-2 mb-1"><Trophy className="w-4 h-4 text-yellow-500" /> Top songs</h3>
                        <p className="text-xs text-[#71717A] mb-3">Most tapped tracks across the platform</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {(topSongs || []).length === 0 && <p className="text-sm text-[#71717A]">No song data yet.</p>}
                            {(topSongs || []).slice(0, 6).map((c: any, idx: number) => (
                                <div key={c.id} className="flex items-center gap-3 p-3 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                                    <div className="font-extrabold text-lg text-white/20 w-6 shrink-0">#{idx + 1}</div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-white text-sm truncate">{c.song_title}</p>
                                        <p className="text-xs text-[#71717A]">by {c.artist?.full_name || "Unknown"}</p>
                                    </div>
                                    <span className="text-xs font-bold text-green-500 shrink-0">{c.clicks || 0} clicks</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
