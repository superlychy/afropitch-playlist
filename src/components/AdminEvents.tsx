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
    country: string;
    image_url: string | null;
    description: string | null;
    ticket_url: string | null;
    is_free: boolean;
    organizer: string | null;
    category: string;
    status: string;
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

interface EventForm {
    title: string;
    slug: string;
    starts_at: string;
    ends_at: string;
    venue: string;
    city: string;
    country: string;
    image_url: string;
    description: string;
    ticket_url: string;
    is_free: boolean;
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
    country: "Nigeria",
    image_url: "",
    description: "",
    ticket_url: "",
    is_free: false,
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

    const load = async () => {
        setLoading(true);
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
                country: e.country,
                image_url: e.image_url ?? "",
                description: e.description ?? "",
                ticket_url: e.ticket_url ?? "",
                is_free: e.is_free ?? false,
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
            country: newForm.country.trim() || "Nigeria",
            image_url: newForm.image_url.trim() || null,
            description: newForm.description.trim() || null,
            ticket_url: newForm.ticket_url.trim() || null,
            is_free: newForm.is_free,
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
                country: f.country.trim() || "Nigeria",
                image_url: f.image_url.trim() || null,
                description: f.description.trim() || null,
                ticket_url: f.ticket_url.trim() || null,
                is_free: f.is_free,
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
            <div className="grid sm:grid-cols-3 gap-4">
                <div>
                    <label className={labelCls}>Venue</label>
                    <input value={f.venue} onChange={(e) => set({ venue: e.target.value })} placeholder="New Afrika Shrine" className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>City</label>
                    <input value={f.city} onChange={(e) => set({ city: e.target.value })} placeholder="Lagos" className={inputCls} />
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
                <label className={labelCls}>Ticket URL <span className="text-gray-500">(optional, links the "Get tickets" button)</span></label>
                <input value={f.ticket_url} onChange={(e) => set({ ticket_url: e.target.value })} placeholder="https://…" className={`${inputCls} font-mono`} />
                <label className="mt-2 flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={f.is_free} onChange={(e) => set({ is_free: e.target.checked })} className="w-4 h-4 accent-green-600" />
                    Free entry <span className="text-gray-500">(shows a "Free entry" badge instead of a ticket button)</span>
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
