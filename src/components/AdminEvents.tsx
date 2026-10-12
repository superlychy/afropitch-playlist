"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Eye, ExternalLink, ChevronDown } from "lucide-react";

interface EventItem {
    id: string;
    title: string;
    slug: string;
    starts_at: string;
    ends_at: string;
    venue: string | null;
    city: string;
    state: string | null;
    country: string;
    image_url: string | null;
    description: string | null;
    ticket_url: string | null;
    is_free: boolean;
    organizer: string | null;
    category: string;
    status: string;
    source: string | null;
    source_url: string | null;
    is_presale: boolean;
    created_at: string;
}

const CATEGORIES = ["concert", "festival", "awards", "industry", "competition", "party", "tour", "showcase"] as const;

const CATEGORY_LABELS: Record<string, string> = {
    concert: "Concert",
    festival: "Festival",
    awards: "Awards",
    industry: "Industry",
    competition: "Competition",
    party: "Party",
    tour: "Tour",
    showcase: "Showcase",
};

// Admin-only source inspection: where this event was found, one click to verify.
const sourceLine = (e: EventItem) => {
    if (e.source_url) {
        let host = e.source_url;
        try { host = new URL(e.source_url).hostname.replace(/^www\./, ""); } catch { /* keep raw */ }
        return (
            <p className="text-xs mt-1">
                <a href={e.source_url} target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                    View source: {host} ↗
                </a>
                {e.source ? <span className="text-gray-600"> · found via {e.source}</span> : null}
            </p>
        );
    }
    if (e.source) return <p className="text-xs text-gray-600 mt-1">Source: {e.source} (no link recorded)</p>;
    return <p className="text-xs text-amber-500 mt-1">No source recorded</p>;
};

const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// datetime-local value ("2026-10-12T19:00") <-> ISO string.
const toLocalInput = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (local: string) => (local ? new Date(local).toISOString() : null);

const inputCls =
    "w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/60";
const labelCls = "text-sm text-gray-300 block mb-1.5";

// Homepage partner spotlight: one curated slot, ships OFF.
// Fields save when you leave them; the preview shows the result.
function HomepageSpotlightCard({
    settings,
    saving,
    onSave,
}: {
    settings: Record<string, any>;
    saving: boolean;
    onSave: (key: string, value: any) => void;
}) {
    const isOn = (v: unknown) => v === true || v === "true";
    const enabled = isOn(settings["spotlight_enabled"]);
    const str = (k: string) => {
        const v = settings[k];
        if (typeof v !== "string") return "";
        const t = v.trim();
        if (t === "" || t === "null") return "";
        return t.replace(/^"+|"+$/g, "");
    };
    const label = str("spotlight_label") || "Partner";
    const headline = str("spotlight_headline");
    const subtext = str("spotlight_subtext");
    const imageUrl = str("spotlight_image_url");
    const linkUrl = str("spotlight_link_url");

    const field = (
        key: string,
        title: string,
        placeholder: string,
        hint?: string,
        mono?: boolean
    ) => (
        <div>
            <label className={labelCls}>
                {title} {hint && <span className="text-gray-500">({hint})</span>}
            </label>
            <input
                defaultValue={str(key)}
                key={`${key}:${str(key)}`}
                placeholder={placeholder}
                disabled={saving}
                onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== str(key)) onSave(key, v || null);
                }}
                className={`${inputCls}${mono ? " font-mono" : ""}`}
            />
        </div>
    );

    return (
        <Card className="border-yellow-500/25 bg-yellow-950/10">
            <CardHeader>
                <CardTitle className="text-white text-base">Homepage spotlight</CardTitle>
                <CardDescription>
                    One curated partner slot on the homepage, below the trust strip. Switched
                    off until a deal goes live. Fields save when you leave them.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <label className="flex items-center gap-3 text-sm text-gray-200 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={enabled}
                        disabled={saving}
                        onChange={(e) => onSave("spotlight_enabled", e.target.checked)}
                        className="w-5 h-5 accent-yellow-500"
                    />
                    <span>
                        <span className="font-semibold text-white">Show homepage spotlight</span>
                        <span className="text-gray-500"> — needs a headline and an image to appear</span>
                    </span>
                </label>

                <div className="grid sm:grid-cols-2 gap-4">
                    {field("spotlight_label", "Eyebrow label", "Partner")}
                    {field("spotlight_headline", "Headline", "Detty December Fest is here")}
                </div>
                {field("spotlight_subtext", "Subtext", "13 days of concerts, culture and raves across Lagos.", "optional")}
                {field("spotlight_image_url", "Image URL", "https://…", "paste or upload in an event and copy the URL", true)}
                {field("spotlight_link_url", "Link URL", "https://…", "optional — where the banner points", true)}

                {headline && imageUrl ? (
                    <div className="pt-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Preview — this is how it will look on the homepage
                        </p>
                        <div className="rounded-2xl overflow-hidden border border-yellow-500/25 bg-white/[0.03]">
                            <div className="flex flex-col sm:flex-row">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imageUrl} alt="" className="w-full sm:w-40 h-32 sm:h-auto object-cover flex-shrink-0" />
                                <div className="p-5 min-w-0 flex-1">
                                    <p className="text-[11px] font-bold text-yellow-400 uppercase tracking-widest mb-2">
                                        {label}
                                    </p>
                                    <p className="text-white font-extrabold text-lg leading-tight">{headline}</p>
                                    {subtext && <p className="text-gray-400 text-sm mt-2">{subtext}</p>}
                                </div>
                            </div>
                        </div>
                        {!enabled && (
                            <p className="text-xs text-amber-500 mt-2">
                                Preview only — the switch above is off, so the homepage shows nothing.
                            </p>
                        )}
                    </div>
                ) : (
                    enabled && (
                        <p className="text-xs text-amber-500">
                            The switch is on but the spotlight needs a headline and an image before it appears.
                        </p>
                    )
                )}
            </CardContent>
        </Card>
    );
}

// Partner placement controls. Everything ships OFF; the switches go live
// only when a partnership deal is signed. The preview shows exactly how
// the banner will look on /events before anything is switched on.
function PartnerPlacementCard({
    events,
    settings,
    saving,
    onSave,
}: {
    events: EventItem[];
    settings: Record<string, any>;
    saving: boolean;
    onSave: (key: string, value: any) => void;
}) {
    // site_settings.value is TEXT ("true"/"false", id, or ""); parse tolerantly
    // because values may also be edited by hand in the dashboard.
    const isOn = (v: unknown) => v === true || v === "true";
    const parseIds = (v: unknown): string[] => {
        if (typeof v !== "string" || !v || v === "null") return [];
        try {
            const a = JSON.parse(v);
            if (Array.isArray(a)) return a.filter((x) => typeof x === "string" && x);
        } catch {
            /* not JSON — fall through */
        }
        return v.includes(",")
            ? v.split(",").map((s) => s.trim()).filter(Boolean)
            : [v];
    };
    const bannerOn = isOn(settings["partner_banner_enabled"]);
    const badgeOn = isOn(settings["presale_badge_enabled"]);
    let bannerIds = parseIds(settings["partner_banner_event_ids"]);
    if (bannerIds.length === 0) {
        const single = settings["partner_banner_event_id"];
        if (typeof single === "string" && single !== "" && single !== "null") {
            bannerIds = [single];
        }
    }
    const publishedEvents = events.filter((e) => e.status === "published");
    const selectedEvents = bannerIds
        .map((id) => publishedEvents.find((e) => e.id === id))
        .filter((e): e is EventItem => !!e);
    const nowMs = Date.now();

    // Searchable picker state (the native select doesn't scale to 100+ events).
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerQuery, setPickerQuery] = useState("");
    const pickerMatches = publishedEvents
        .filter((e) => !bannerIds.includes(e.id))
        .filter((e) => e.title.toLowerCase().includes(pickerQuery.trim().toLowerCase()))
        .slice(0, 8);

    const saveIds = (ids: string[]) => {
        // Write the array key; clear the legacy single key so the two can't disagree.
        onSave("partner_banner_event_ids", JSON.stringify(ids));
        onSave("partner_banner_event_id", "");
    };
    const addBanner = (id: string) => {
        if (bannerIds.includes(id) || bannerIds.length >= 5) return;
        saveIds([...bannerIds, id]);
        setPickerOpen(false);
        setPickerQuery("");
    };
    const removeBanner = (id: string) => saveIds(bannerIds.filter((x) => x !== id));

    return (
        <Card className="border-yellow-500/25 bg-yellow-950/10">
            <CardHeader>
                <CardTitle className="text-white text-base">Partner placement</CardTitle>
                <CardDescription>
                    The banner and the presale badge are switched off. Flip them on when a
                    partnership deal goes live. The preview below shows exactly how the
                    banner will look on /events.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <label className="flex items-center gap-3 text-sm text-gray-200 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={bannerOn}
                        disabled={saving}
                        onChange={(e) => onSave("partner_banner_enabled", e.target.checked)}
                        className="w-5 h-5 accent-yellow-500"
                    />
                    <span>
                        <span className="font-semibold text-white">Show partner banner</span>
                        <span className="text-gray-500"> — pins the featured event front and centre on /events</span>
                    </span>
                </label>

                <div className="relative">
                    <label className={labelCls}>
                        Featured events for the banner{" "}
                        <span className="text-gray-500">(up to 5 — several become a swipeable carousel)</span>
                    </label>
                    {selectedEvents.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {selectedEvents.map((e) => {
                                const ended = new Date(e.ends_at).getTime() < nowMs;
                                return (
                                    <span
                                        key={e.id}
                                        className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/15 pl-3 pr-1.5 py-1 text-sm text-white"
                                    >
                                        <span className="max-w-[220px] truncate">{e.title}</span>
                                        {ended && (
                                            <span className="text-[10px] font-bold text-amber-400 uppercase">ended</span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeBanner(e.id)}
                                            disabled={saving}
                                            aria-label={`Remove ${e.title}`}
                                            className="w-6 h-6 rounded-full bg-white/10 hover:bg-red-500/30 text-gray-300 hover:text-white text-xs"
                                        >
                                            ×
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                    )}
                    {bannerIds.length < 5 && (
                        <>
                            <input
                                value={pickerOpen ? pickerQuery : ""}
                                placeholder={
                                    selectedEvents.length === 0
                                        ? "Type to search published events…"
                                        : "Add another…"
                                }
                                disabled={saving}
                                onFocus={() => { setPickerQuery(""); setPickerOpen(true); }}
                                onChange={(e) => { setPickerQuery(e.target.value); setPickerOpen(true); }}
                                onBlur={() => setTimeout(() => setPickerOpen(false), 150)}
                                className={inputCls}
                            />
                            {pickerOpen && (
                                <div className="absolute z-20 mt-1 w-full rounded-xl border border-white/15 bg-[#141414] shadow-xl max-h-64 overflow-auto">
                                    {pickerMatches.map((e) => (
                                        <button
                                            key={e.id}
                                            type="button"
                                            onMouseDown={(e2) => e2.preventDefault()}
                                            onClick={() => addBanner(e.id)}
                                            className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/5"
                                        >
                                            {e.title}
                                            <span className="text-gray-600"> · {e.city}</span>
                                        </button>
                                    ))}
                                    {pickerMatches.length === 0 && (
                                        <p className="px-4 py-2.5 text-sm text-gray-600">No published events match.</p>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <label className="flex items-center gap-3 text-sm text-gray-200 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={badgeOn}
                        disabled={saving}
                        onChange={(e) => onSave("presale_badge_enabled", e.target.checked)}
                        className="w-5 h-5 accent-yellow-500"
                    />
                    <span>
                        <span className="font-semibold text-white">Show "AfroPitch presale" badges</span>
                        <span className="text-gray-500"> — appears on every event ticked with "Presale badge" in its edit form</span>
                    </span>
                </label>

                {selectedEvents.length > 0 ? (
                    <div className="pt-2 space-y-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Preview — this is how {selectedEvents.length > 1 ? "the carousel" : "it"} will look on /events
                        </p>
                        {selectedEvents.map((previewEvent) => {
                            const ended = new Date(previewEvent.ends_at).getTime() < nowMs;
                            const live =
                                new Date(previewEvent.starts_at).getTime() <= nowMs &&
                                new Date(previewEvent.ends_at).getTime() >= nowMs;
                            return (
                                <div key={previewEvent.id}>
                                    <div className="rounded-2xl overflow-hidden border border-yellow-500/40 bg-gradient-to-br from-yellow-950/30 via-white/5 to-white/5">
                                        <div className="flex flex-col sm:flex-row">
                                            {previewEvent.image_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={previewEvent.image_url}
                                                    alt=""
                                                    className="w-full sm:w-48 h-36 sm:h-auto object-cover flex-shrink-0"
                                                />
                                            ) : (
                                                <div className="w-full sm:w-48 h-36 sm:h-auto bg-gradient-to-br from-green-900/50 to-yellow-900/50 flex-shrink-0" />
                                            )}
                                            <div className="p-5 min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                                    {live ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-red-600 text-white rounded-full px-2.5 py-0.5 uppercase tracking-wider">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live now
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] font-bold text-yellow-400 uppercase tracking-widest">
                                                            Partner event
                                                        </span>
                                                    )}
                                                    {previewEvent.is_presale && (
                                                        <span className="inline-flex items-center text-[11px] font-bold bg-yellow-500 text-black rounded-full px-2.5 py-0.5 uppercase tracking-wider">
                                                            AfroPitch presale
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-white font-extrabold text-xl leading-tight">
                                                    {previewEvent.title}
                                                </p>
                                                <p className="text-sm text-gray-400 mt-2">
                                                    {new Date(previewEvent.starts_at).toLocaleDateString(undefined, {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}{" "}
                                                    · {previewEvent.city}
                                                    {previewEvent.venue ? ` · ${previewEvent.venue}` : ""}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    {ended ? (
                                        <p className="text-xs text-amber-500 mt-1">
                                            This event has ended — it switches off by itself and won't show publicly.
                                        </p>
                                    ) : (
                                        !bannerOn && (
                                            <p className="text-xs text-amber-500 mt-1">
                                                Preview only — the switch above is off, so the public site shows nothing.
                                            </p>
                                        )
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    bannerOn && (
                        <p className="text-xs text-amber-500">
                            The banner switch is on but no event is picked — nothing will show until you pick one.
                        </p>
                    )
                )}
            </CardContent>
        </Card>
    );
}

interface EventForm {
    title: string;
    slug: string;
    starts_at: string;
    ends_at: string;
    venue: string;
    city: string;
    state: string;
    country: string;
    image_url: string;
    description: string;
    ticket_url: string;
    source_url: string;
    is_free: boolean;
    is_presale: boolean;
    organizer: string;
    category: string;
}

const emptyForm = (): EventForm => ({
    title: "",
    slug: "",
    starts_at: "",
    ends_at: "",
    venue: "",
    city: "",
    state: "",
    country: "Nigeria",
    image_url: "",
    description: "",
    ticket_url: "",
    source_url: "",
    is_free: false,
    is_presale: false,
    organizer: "",
    category: "concert",
});

export function AdminEvents() {
    const { toast } = useToast();
    const [events, setEvents] = useState<EventItem[]>([]);
    const [interestCounts, setInterestCounts] = useState<Record<string, { interested: number; not: number }>>({});
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);
    const [uploading, setUploading] = useState<string | null>(null);

    const [newForm, setNewForm] = useState<EventForm>(emptyForm());
    const [edits, setEdits] = useState<Record<string, EventForm>>({});
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [savingSettings, setSavingSettings] = useState(false);

    const load = async () => {
        setLoading(true);
        const { data: settingRows } = await supabase.from("site_settings").select("key, value");
        const smap: Record<string, any> = {};
        for (const r of settingRows ?? []) smap[r.key] = r.value;
        setSettings(smap);
        const { data } = await supabase
            .from("events")
            .select("*")
            .order("starts_at", { ascending: false });
        setEvents((data ?? []) as EventItem[]);
        const { data: votes } = await supabase.from("event_interest").select("event_id, value");
        const agg: Record<string, { interested: number; not: number }> = {};
        for (const v of votes ?? []) {
            const a = (agg[v.event_id] ??= { interested: 0, not: 0 });
            if (v.value === "interested") a.interested++;
            else a.not++;
        }
        setInterestCounts(agg);
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const setNew = (patch: Partial<EventForm>) => {
        setNewForm((prev) => {
            const next = { ...prev, ...patch };
            // Auto-slug from the title until the admin edits the slug by hand.
            if (patch.title !== undefined && !prev.slug) next.slug = slugify(patch.title);
            return next;
        });
    };

    const getEdit = (e: EventItem): EventForm => {
        if (!edits[e.id]) {
            const form: EventForm = {
                title: e.title,
                slug: e.slug,
                starts_at: toLocalInput(e.starts_at),
                ends_at: toLocalInput(e.ends_at),
                venue: e.venue ?? "",
                city: e.city,
                state: e.state ?? "",
                country: e.country,
                image_url: e.image_url ?? "",
                description: e.description ?? "",
                ticket_url: e.ticket_url ?? "",
                source_url: e.source_url ?? "",
                is_free: e.is_free ?? false,
                is_presale: e.is_presale ?? false,
                organizer: e.organizer ?? "",
                category: e.category,
            };
            setEdits((prev) => ({ ...prev, [e.id]: form }));
            return form;
        }
        return edits[e.id];
    };
    const setEdit = (id: string, patch: Partial<EventForm>) =>
        setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] ?? ({} as EventForm)), ...patch } }));

    const ensureUniqueSlug = async (base: string, excludeId?: string) => {
        let slug = base || `event-${Date.now()}`;
        let n = 2;
        for (;;) {
            let q = supabase.from("events").select("id").eq("slug", slug).limit(1);
            if (excludeId) q = q.neq("id", excludeId);
            const { data } = await q;
            if (!data || data.length === 0) return slug;
            slug = `${base}-${n++}`;
        }
    };

    const validate = (f: EventForm) => {
        if (!f.title.trim()) return "Give the event a title.";
        if (!f.starts_at || !f.ends_at) return "Set a start and end date/time.";
        if (new Date(f.ends_at) < new Date(f.starts_at)) return "The end must be after the start.";
        if (!f.city.trim()) return "Set a city.";
        return null;
    };

    const createEvent = async () => {
        const err = validate(newForm);
        if (err) {
            toast(err, "error");
            return;
        }
        setCreating(true);
        const slug = await ensureUniqueSlug(slugify(newForm.slug || newForm.title));
        const { error } = await supabase.from("events").insert({
            title: newForm.title.trim(),
            slug,
            starts_at: fromLocalInput(newForm.starts_at),
            ends_at: fromLocalInput(newForm.ends_at),
            venue: newForm.venue.trim() || null,
            city: newForm.city.trim(),
            state: newForm.state.trim() || null,
            country: newForm.country.trim() || "Nigeria",
            image_url: newForm.image_url.trim() || null,
            description: newForm.description.trim() || null,
            ticket_url: newForm.ticket_url.trim() || null,
            source_url: newForm.source_url.trim() || null,
            is_free: newForm.is_free,
            is_presale: newForm.is_presale,
            organizer: newForm.organizer.trim() || null,
            category: newForm.category,
            status: "draft",
        });
        setCreating(false);
        if (error) {
            toast("Could not create the event: " + error.message, "error");
            return;
        }
        toast("Event created as a draft. Publish it when ready.", "success");
        setShowNew(false);
        setNewForm(emptyForm());
        load();
    };

    const saveEvent = async (e: EventItem) => {
        const f = getEdit(e);
        const err = validate(f);
        if (err) {
            toast(err, "error");
            return;
        }
        setSaving(e.id);
        const slug = await ensureUniqueSlug(slugify(f.slug || f.title), e.id);
        const { error } = await supabase
            .from("events")
            .update({
                title: f.title.trim(),
                slug,
                starts_at: fromLocalInput(f.starts_at),
                ends_at: fromLocalInput(f.ends_at),
                venue: f.venue.trim() || null,
                city: f.city.trim(),
                state: f.state.trim() || null,
                country: f.country.trim() || "Nigeria",
                image_url: f.image_url.trim() || null,
                description: f.description.trim() || null,
                ticket_url: f.ticket_url.trim() || null,
                source_url: f.source_url.trim() || null,
                is_free: f.is_free,
                is_presale: f.is_presale,
                organizer: f.organizer.trim() || null,
                category: f.category,
                updated_at: new Date().toISOString(),
            })
            .eq("id", e.id);
        setSaving(null);
        if (error) {
            toast("Save failed: " + error.message, "error");
            return;
        }
        toast("Saved.", "success");
        setEdits((prev) => {
            const next = { ...prev };
            delete next[e.id];
            return next;
        });
        load();
    };

    const setStatus = async (e: EventItem, status: string) => {
        if (status === "published" && !confirm(`Publish "${e.title}"? It will appear on /events.`)) return;
        setSaving(e.id);
        const { error } = await supabase.from("events").update({ status }).eq("id", e.id);
        setSaving(null);
        if (error) {
            toast("Failed: " + error.message, "error");
            return;
        }
        toast(status === "published" ? "Published! It's live on /events." : "Moved back to draft.", "success");
        load();
    };

    const deleteEvent = async (e: EventItem) => {
        if (!confirm(`Delete "${e.title}"? This can't be undone.`)) return;
        const { error } = await supabase.from("events").delete().eq("id", e.id);
        if (error) {
            toast("Delete failed: " + error.message, "error");
            return;
        }
        toast("Deleted.", "success");
        load();
    };

    // Partner placement switches. Both ship OFF; flip them when a deal goes live.
    const saveSetting = async (key: string, value: any) => {
        setSavingSettings(true);
        const { error } = await supabase
            .from("site_settings")
            .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
        setSavingSettings(false);
        if (error) {
            toast("Could not save the switch: " + error.message, "error");
            return;
        }
        setSettings((prev) => ({ ...prev, [key]: value }));
        toast("Saved.", "success");
    };

    const uploadImage = async (eventId: string | null, file: File | undefined | null, isNew: boolean) => {
        if (!file) return;
        if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
            toast("Please choose a JPG, PNG or WebP image.", "error");
            return;
        }
        if (!eventId) {
            toast("Save the event first, then upload its image.", "error");
            return;
        }
        const key = isNew ? "new" : eventId;
        setUploading(key);
        try {
            const fd = new FormData();
            fd.append("file", file, file.name);
            fd.append("event_id", eventId);
            const res = await fetch("/api/events/upload-image", { method: "POST", body: fd });
            const json = await res.json().catch(() => null);
            if (!json?.ok) throw new Error(json?.error || "Upload failed.");
            if (isNew) setNew({ image_url: json.url });
            else setEdit(eventId, { image_url: json.url });
            toast("Image uploaded.", "success");
            if (!isNew) load();
        } catch (err: any) {
            toast(err?.message || "Upload failed.", "error");
        } finally {
            setUploading(null);
        }
    };

    const renderForm = (f: EventForm, set: (patch: Partial<EventForm>) => void, isNew: boolean, eventId: string | null) => (
        <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelCls}>Title</label>
                    <input value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Felabration 2026" className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>URL slug <span className="text-gray-500">(Google indexes this)</span></label>
                    <input
                        value={f.slug}
                        onChange={(e) => set({ slug: slugify(e.target.value) })}
                        placeholder="auto from title"
                        className={`${inputCls} font-mono`}
                    />
                    <p className="text-xs text-gray-600 mt-1">→ afropitchplay.best/events/{f.slug || slugify(f.title) || "…"}</p>
                </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelCls}>Starts</label>
                    <input type="datetime-local" value={f.starts_at} onChange={(e) => set({ starts_at: e.target.value })} className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>Ends</label>
                    <input type="datetime-local" value={f.ends_at} onChange={(e) => set({ ends_at: e.target.value })} className={inputCls} />
                </div>
            </div>
            <div className="grid sm:grid-cols-4 gap-4">
                <div>
                    <label className={labelCls}>Venue</label>
                    <input value={f.venue} onChange={(e) => set({ venue: e.target.value })} placeholder="New Afrika Shrine" className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>City</label>
                    <input value={f.city} onChange={(e) => set({ city: e.target.value })} placeholder="Lagos" className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>State / Province</label>
                    <input value={f.state} onChange={(e) => set({ state: e.target.value })} placeholder="Lagos" className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>Country</label>
                    <input value={f.country} onChange={(e) => set({ country: e.target.value })} className={inputCls} />
                </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelCls}>Category</label>
                    <select value={f.category} onChange={(e) => set({ category: e.target.value })} className={inputCls}>
                        {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Organizer <span className="text-gray-500">(optional)</span></label>
                    <input value={f.organizer} onChange={(e) => set({ organizer: e.target.value })} className={inputCls} />
                </div>
            </div>
            <div>
                <label className={labelCls}>Image</label>
                <div className="flex items-center gap-3 flex-wrap">
                    {f.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.image_url} alt="" className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                    )}
                    <input
                        value={f.image_url}
                        onChange={(e) => set({ image_url: e.target.value })}
                        placeholder="Paste an image URL, or upload one"
                        className={`${inputCls} flex-1 min-w-[200px]`}
                    />
                    <label className="cursor-pointer text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2.5 text-gray-300 transition-all">
                        {uploading === (isNew ? "new" : eventId) ? "Uploading…" : "Upload"}
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            disabled={uploading === (isNew ? "new" : eventId)}
                            onChange={(e) => { uploadImage(eventId, e.target.files?.[0], isNew); e.target.value = ""; }}
                        />
                    </label>
                </div>
            </div>
            <div>
                <label className={labelCls}>Description</label>
                <textarea value={f.description} onChange={(e) => set({ description: e.target.value })} rows={4} placeholder="What is this event about? Lineup, vibe, what to expect." className={`${inputCls} leading-relaxed`} />
            </div>
            <div>
                <label className={labelCls}>Source URL <span className="text-gray-500">(admin only: the page where this event was found, so you can open it and verify the listing)</span></label>
                <input value={f.source_url} onChange={(e) => set({ source_url: e.target.value })} placeholder="https://…" className={`${inputCls} font-mono`} />
            </div>
            <div>
                <label className={labelCls}>Ticket URL <span className="text-gray-500">(optional, links the "Get tickets" button)</span></label>
                <input value={f.ticket_url} onChange={(e) => set({ ticket_url: e.target.value })} placeholder="https://…" className={`${inputCls} font-mono`} />
                <label className="mt-2 flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={f.is_free} onChange={(e) => set({ is_free: e.target.checked })} className="w-4 h-4 accent-green-600" />
                    Free entry <span className="text-gray-500">(shows a "Free entry" badge instead of a ticket button)</span>
                </label>
                <label className="mt-2 flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={f.is_presale} onChange={(e) => set({ is_presale: e.target.checked })} className="w-4 h-4 accent-yellow-500" />
                    Presale badge <span className="text-gray-500">(shows the "AfroPitch presale" badge on this event, but only while the presale switch is on below)</span>
                </label>
            </div>
        </div>
    );

    if (loading) {
        return <div className="flex items-center gap-2 text-gray-400 py-10"><Loader2 className="w-5 h-5 animate-spin" /> Loading events…</div>;
    }

    const drafts = events.filter((e) => e.status === "draft");
    const published = events.filter((e) => e.status === "published");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Events</h2>
                    <p className="text-sm text-gray-500">Draft an event → review → publish. Published events get their own SEO page on /events.</p>
                </div>
                <Button onClick={() => setShowNew((v) => !v)} className="bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl">
                    <Plus className="w-4 h-4 mr-1.5" /> New event
                </Button>
            </div>

            <PartnerPlacementCard
                events={events}
                settings={settings}
                saving={savingSettings}
                onSave={saveSetting}
            />

            <HomepageSpotlightCard
                settings={settings}
                saving={savingSettings}
                onSave={saveSetting}
            />

            {showNew && (
                <Card className="border-yellow-500/25 bg-yellow-950/10">
                    <CardHeader>
                        <CardTitle className="text-white text-base">New event</CardTitle>
                        <CardDescription>Fill in the details. It saves as a draft; publish it when the listing is ready.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {renderForm(newForm, setNew, true, null)}
                        <Button onClick={createEvent} disabled={creating} className="bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl">
                            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                            Create draft
                        </Button>
                    </CardContent>
                </Card>
            )}

            {drafts.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-widest">Drafts ({drafts.length})</h3>
                    {drafts.map((e) => {
                        const f = getEdit(e);
                        const isOpen = expanded === e.id;
                        return (
                            <Card key={e.id} className="border-white/10 bg-white/5">
                                <CardContent className="pt-5 pb-5">
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <div className="min-w-0">
                                            <p className="text-white font-bold text-lg">{e.title}</p>
                                            <p className="text-sm text-gray-500">
                                                {e.starts_at ? new Date(e.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : ""} · {e.city}
                                            </p>
                                            {sourceLine(e)}
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            <Button size="sm" variant="outline" onClick={() => setExpanded(isOpen ? null : e.id)} className="border-white/15 rounded-xl">
                                                {isOpen ? "Hide" : <><Eye className="w-3.5 h-3.5 mr-1" /> Edit</>}
                                            </Button>
                                        </div>
                                    </div>
                                    {isOpen && (
                                        <div className="mt-5 space-y-4 border-t border-white/10 pt-5">
                                            {renderForm(f, (p) => setEdit(e.id, p), false, e.id)}
                                            <div className="flex gap-2 flex-wrap">
                                                <Button size="sm" onClick={() => saveEvent(e)} disabled={saving === e.id} className="bg-white/10 hover:bg-white/15 text-white rounded-xl">
                                                    {saving === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null} Save edits
                                                </Button>
                                                <Button size="sm" onClick={() => setStatus(e, "published")} disabled={saving === e.id} className="bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-bold">
                                                    Publish
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => deleteEvent(e)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl">
                                                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {published.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-green-400 uppercase tracking-widest">Published ({published.length})</h3>
                    {published.map((e) => (
                        <Card key={e.id} className="border-white/10 bg-white/5">
                            <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4 flex-wrap">
                                <div className="min-w-0">
                                    <p className="text-white font-semibold">{e.title}</p>
                                    <p className="text-xs text-gray-500 font-mono">/events/{e.slug}</p>
                                    {sourceLine(e)}
                                    {interestCounts[e.id] && (interestCounts[e.id].interested > 0 || interestCounts[e.id].not > 0) && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            <span className="text-green-400">{interestCounts[e.id].interested} interested</span>
                                            {" · "}
                                            <span className="text-red-400">{interestCounts[e.id].not} not interested</span>
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <a href={`https://afropitchplay.best/events/${e.slug}`} target="_blank" rel="noreferrer">
                                        <Button size="sm" variant="outline" className="border-white/15 rounded-xl">
                                            <ExternalLink className="w-3.5 h-3.5 mr-1" /> View
                                        </Button>
                                    </a>
                                    <Button size="sm" variant="outline" onClick={() => setExpanded(expanded === e.id ? null : e.id)} className="border-white/15 rounded-xl">
                                        <Eye className="w-3.5 h-3.5 mr-1" /> Edit
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setStatus(e, "draft")} className="text-gray-400 hover:text-white rounded-xl">
                                        Unpublish
                                    </Button>
                                </div>
                            </CardContent>
                            {expanded === e.id && (
                                <CardContent className="pt-0 pb-5">
                                    <div className="space-y-4 border-t border-white/10 pt-5">
                                        {renderForm(getEdit(e), (p) => setEdit(e.id, p), false, e.id)}
                                        <div className="flex gap-2 flex-wrap">
                                            <Button size="sm" onClick={() => saveEvent(e)} disabled={saving === e.id} className="bg-white/10 hover:bg-white/15 text-white rounded-xl">
                                                {saving === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null} Save edits
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => deleteEvent(e)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl">
                                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {events.length === 0 && (
                <Card className="border-dashed border-white/10 bg-white/5">
                    <CardContent className="pt-10 pb-10 text-center">
                        <p className="text-gray-400">No events yet. Create the first one above.</p>
                    </CardContent>
                </Card>
            )}

            <p className="text-xs text-gray-600">
                <ChevronDown className="w-3 h-3 inline mr-1" />
                Flow: create draft → review the listing → publish → it appears on /events with its own Google-friendly page. Ticket clicks are tracked automatically.
            </p>
        </div>
    );
}
