"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Copy, Check, Plus, ExternalLink, Trash2, Eye, ChevronDown } from "lucide-react";

interface Feature {
    id: string;
    week_start: string | null;
    artist_id: string | null;
    submission_id: string | null;
    headline: string | null;
    story: string | null;
    bio: string | null;
    qa: { q: string; a: string }[] | null;
    photo_url: string | null;
    cover_art_url: string | null;
    socials: Record<string, string> | null;
    slug: string | null;
    status: string;
    questionnaire_token: string | null;
    questionnaire_completed_at: string | null;
    created_at: string;
    artist_name?: string;
    song_title?: string;
}

interface AcceptedSong {
    id: string;
    song_title: string;
    artist_id: string;
    artist_name: string;
}

const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function AdminFeatured() {
    const { toast } = useToast();
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(true);
    const [songs, setSongs] = useState<AcceptedSong[]>([]);
    const [showNew, setShowNew] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    // new-draft form
    const [newArtist, setNewArtist] = useState("");
    const [newSong, setNewSong] = useState("");
    const [newWeek, setNewWeek] = useState(() => new Date().toISOString().slice(0, 10));
    const [newHeadline, setNewHeadline] = useState("");
    const [creating, setCreating] = useState(false);

    // per-draft edits
    const [edits, setEdits] = useState<Record<string, { headline: string; story: string; slug: string }>>({});
    const [saving, setSaving] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("featured_artists")
            .select("*")
            .order("created_at", { ascending: false });
        const rows = (data ?? []) as Feature[];
        const artistIds = [...new Set(rows.map((r) => r.artist_id).filter(Boolean))] as string[];
        const subIds = [...new Set(rows.map((r) => r.submission_id).filter(Boolean))] as string[];
        const names: Record<string, string> = {};
        const titles: Record<string, string> = {};
        if (artistIds.length) {
            const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", artistIds);
            for (const p of profs ?? []) names[p.id] = (p as any).full_name ?? "Unknown artist";
        }
        if (subIds.length) {
            const { data: subs } = await supabase.from("submissions").select("id, song_title").in("id", subIds);
            for (const s of subs ?? []) titles[s.id] = (s as any).song_title ?? "";
        }
        setFeatures(rows.map((r) => ({
            ...r,
            artist_name: r.artist_id ? names[r.artist_id] ?? "Unknown artist" : "—",
            song_title: r.submission_id ? titles[r.submission_id] ?? "" : "",
        })));
        setLoading(false);
    };

    const loadSongs = async () => {
        const { data } = await supabase
            .from("submissions")
            .select("id, song_title, artist_id")
            .eq("status", "accepted")
            .order("created_at", { ascending: false })
            .limit(100);
        const rows = (data ?? []) as { id: string; song_title: string; artist_id: string }[];
        const ids = [...new Set(rows.map((r) => r.artist_id))];
        const names: Record<string, string> = {};
        if (ids.length) {
            const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
            for (const p of profs ?? []) names[p.id] = (p as any).full_name ?? "Unknown artist";
        }
        setSongs(rows.map((r) => ({ ...r, artist_name: names[r.artist_id] ?? "Unknown artist" })));
    };

    useEffect(() => {
        load();
        loadSongs();
    }, []);

    const getEdit = (f: Feature) => {
        if (!edits[f.id]) {
            const e = {
                headline: f.headline ?? "",
                story: f.story ?? "",
                slug: f.slug ?? slugify(f.artist_name ?? ""),
            };
            setEdits((prev) => ({ ...prev, [f.id]: e }));
            return e;
        }
        return edits[f.id];
    };

    const questionnaireLink = (f: Feature) =>
        f.questionnaire_token ? `https://afropitchplay.best/featured/questionnaire/${f.questionnaire_token}` : "";

    const copyLink = async (f: Feature) => {
        const link = questionnaireLink(f);
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
        } catch {
            const ta = document.createElement("textarea");
            ta.value = link;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
        }
        setCopied(f.id);
        setTimeout(() => setCopied(null), 2000);
    };

    const createDraft = async () => {
        if (!newArtist || !newSong) {
            toast("Pick an artist and a song first.", "error");
            return;
        }
        setCreating(true);
        const song = songs.find((s) => s.id === newSong);
        const token = crypto.randomUUID();
        const { data, error } = await supabase
            .from("featured_artists")
            .insert({
                artist_id: newArtist,
                submission_id: newSong,
                week_start: newWeek,
                headline: newHeadline.trim() || null,
                status: "draft",
                questionnaire_token: token,
            })
            .select("id")
            .single();
        setCreating(false);
        if (error || !data) {
            toast("Could not create the draft: " + (error?.message ?? "unknown error"), "error");
            return;
        }
        toast(`Draft created for ${song?.artist_name}. Send them the questionnaire link.`, "success");
        setShowNew(false);
        setNewArtist("");
        setNewSong("");
        setNewHeadline("");
        load();
    };

    const saveDraft = async (f: Feature) => {
        const e = getEdit(f);
        setSaving(f.id);
        const { error } = await supabase
            .from("featured_artists")
            .update({ headline: e.headline.trim() || null, story: e.story.trim() || null, slug: e.slug.trim() || null })
            .eq("id", f.id);
        setSaving(null);
        if (error) {
            toast("Save failed: " + error.message, "error");
            return;
        }
        toast("Saved.", "success");
        load();
    };

    const uploadPhoto = async (f: Feature, file: File | undefined | null) => {
        if (!file) return;
        if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
            toast("Please choose a JPG, PNG or WebP photo.", "error");
            return;
        }
        setUploadingPhoto(f.id);
        try {
            const fd = new FormData();
            fd.append("file", file, file.name);
            fd.append("feature_id", f.id);
            const res = await fetch("/api/featured/upload-photo", { method: "POST", body: fd });
            const json = await res.json().catch(() => null);
            if (!json?.ok) throw new Error(json?.error || "Upload failed.");
            toast("Photo updated.", "success");
            load();
        } catch (e: any) {
            toast(e?.message || "Upload failed.", "error");
        } finally {
            setUploadingPhoto(null);
        }
    };

    const setStatus = async (f: Feature, status: string) => {
        if (status === "published") {
            const e = getEdit(f);
            if (!e.slug.trim()) {
                toast("Set a URL slug before publishing — it's what Google will index.", "error");
                return;
            }
            if (!f.questionnaire_completed_at) {
                if (!confirm("The artist hasn't filled the questionnaire yet. Publish anyway?")) return;
            }
        }
        if (status === "published" && !confirm(`Publish "${f.artist_name}" as this week's featured artist?`)) return;
        setSaving(f.id);
        const { error } = await supabase.from("featured_artists").update({ status }).eq("id", f.id);
        setSaving(null);
        if (error) {
            toast("Failed: " + error.message, "error");
            return;
        }
        toast(status === "published" ? "Published! It's live on /featured." : `Moved to ${status}.`, "success");
        load();
    };

    const deleteFeature = async (f: Feature) => {
        if (!confirm(`Delete the feature for "${f.artist_name}"? This can't be undone.`)) return;
        const { error } = await supabase.from("featured_artists").delete().eq("id", f.id);
        if (error) {
            toast("Delete failed: " + error.message, "error");
            return;
        }
        toast("Deleted.", "success");
        load();
    };

    const artists = [...new Map(songs.map((s) => [s.artist_id, s.artist_name])).entries()];
    const artistSongs = songs.filter((s) => s.artist_id === newArtist);

    if (loading) {
        return <div className="flex items-center gap-2 text-gray-400 py-10"><Loader2 className="w-5 h-5 animate-spin" /> Loading features…</div>;
    }

    const drafts = features.filter((f) => f.status === "draft");
    const published = features.filter((f) => f.status === "published");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Featured Artist</h2>
                    <p className="text-sm text-gray-500">Drafts → artist questionnaire → review → publish. Published features get their own SEO page.</p>
                </div>
                <Button onClick={() => setShowNew((v) => !v)} className="bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl">
                    <Plus className="w-4 h-4 mr-1.5" /> New feature
                </Button>
            </div>

            {showNew && (
                <Card className="border-yellow-500/25 bg-yellow-950/10">
                    <CardHeader>
                        <CardTitle className="text-white text-base">New draft</CardTitle>
                        <CardDescription>Pick the artist and song. A private questionnaire link is created for them to fill in their bio.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-300 block mb-1.5">Artist</label>
                                <select
                                    value={newArtist}
                                    onChange={(e) => { setNewArtist(e.target.value); setNewSong(""); }}
                                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/60"
                                >
                                    <option value="">Select artist…</option>
                                    {artists.map(([id, name]) => (
                                        <option key={id} value={id}>{name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-gray-300 block mb-1.5">Song</label>
                                <select
                                    value={newSong}
                                    onChange={(e) => setNewSong(e.target.value)}
                                    disabled={!newArtist}
                                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/60 disabled:opacity-40"
                                >
                                    <option value="">{newArtist ? "Select song…" : "Pick an artist first"}</option>
                                    {artistSongs.map((s) => (
                                        <option key={s.id} value={s.id}>{s.song_title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-300 block mb-1.5">Week starting</label>
                                <input
                                    type="date"
                                    value={newWeek}
                                    onChange={(e) => setNewWeek(e.target.value)}
                                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/60"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-300 block mb-1.5">Headline <span className="text-gray-500">(optional)</span></label>
                                <input
                                    value={newHeadline}
                                    onChange={(e) => setNewHeadline(e.target.value)}
                                    placeholder="e.g. The street-pop voice of the new Lagos"
                                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-yellow-500/60"
                                />
                            </div>
                        </div>
                        <Button onClick={createDraft} disabled={creating} className="bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl">
                            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                            Create draft & get questionnaire link
                        </Button>
                    </CardContent>
                </Card>
            )}

            {drafts.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-widest">Drafts awaiting review ({drafts.length})</h3>
                    {drafts.map((f) => {
                        const e = getEdit(f);
                        const isOpen = expanded === f.id;
                        return (
                            <Card key={f.id} className="border-white/10 bg-white/5">
                                <CardContent className="pt-5 pb-5">
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <div className="min-w-0">
                                            <p className="text-white font-bold text-lg">{f.artist_name}</p>
                                            <p className="text-sm text-gray-500">
                                                {f.song_title ? `“${f.song_title}”` : ""} {f.week_start ? `· week of ${f.week_start}` : ""}
                                            </p>
                                            <div className="mt-2">
                                                {f.questionnaire_completed_at ? (
                                                    <span className="inline-block text-xs bg-green-500/15 text-green-400 border border-green-500/25 rounded-full px-2.5 py-1">
                                                        ✓ Questionnaire filled {new Date(f.questionnaire_completed_at).toLocaleDateString()}
                                                    </span>
                                                ) : (
                                                    <span className="inline-block text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/25 rounded-full px-2.5 py-1">
                                                        Waiting on artist
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            <Button size="sm" variant="outline" onClick={() => copyLink(f)} className="border-white/15 rounded-xl">
                                                {copied === f.id ? <Check className="w-3.5 h-3.5 mr-1 text-green-400" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                                                {copied === f.id ? "Copied!" : "Questionnaire link"}
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => setExpanded(isOpen ? null : f.id)} className="border-white/15 rounded-xl">
                                                {isOpen ? "Hide" : <><Eye className="w-3.5 h-3.5 mr-1" /> Review</>}
                                            </Button>
                                        </div>
                                    </div>

                                    {f.questionnaire_token && (
                                        <p className="mt-3 text-xs text-gray-600 break-all font-mono bg-black/30 rounded-lg px-3 py-2">
                                            {questionnaireLink(f)}
                                        </p>
                                    )}

                                    {isOpen && (
                                        <div className="mt-5 space-y-4 border-t border-white/10 pt-5">
                                            {f.bio ? (
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1.5">Bio (from artist)</p>
                                                    <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">{f.bio}</p>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-600 italic">No bio submitted yet.</p>
                                            )}
                                            {f.qa && f.qa.length > 0 && (
                                                <div className="space-y-3">
                                                    <p className="text-xs text-gray-500 uppercase tracking-widest">Q&A (from artist)</p>
                                                    {f.qa.map((item, i) => (
                                                        <div key={i} className="bg-black/30 rounded-xl px-4 py-3">
                                                            <p className="text-sm text-yellow-200/80 font-medium mb-1">{item.q}</p>
                                                            <p className="text-sm text-gray-300 whitespace-pre-line">{item.a}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 flex-wrap">
                                                {(f.photo_url || f.cover_art_url) && (
                                                    <div className="relative">
                                                        <img src={f.photo_url ?? f.cover_art_url ?? ""} alt="" className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                                                        {!f.photo_url && f.cover_art_url && (
                                                            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] bg-black/80 text-yellow-300 px-1.5 py-0.5 rounded whitespace-nowrap">song cover</span>
                                                        )}
                                                    </div>
                                                )}
                                                <label className="cursor-pointer text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-gray-300 transition-all">
                                                    {uploadingPhoto === f.id ? "Uploading…" : (f.photo_url ? "Replace photo" : "Upload photo")}
                                                    <input
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp"
                                                        className="hidden"
                                                        disabled={uploadingPhoto === f.id}
                                                        onChange={(e) => { uploadPhoto(f, e.target.files?.[0]); e.target.value = ""; }}
                                                    />
                                                </label>
                                                {f.socials && Object.entries(f.socials).filter(([, v]) => v).map(([k, v]) => (
                                                    <a key={k} href={/^https?:\/\//i.test(v as string) ? (v as string) : `https://${v}`} target="_blank" rel="noopener noreferrer"
                                                        className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-green-300 hover:border-green-500/40 inline-flex items-center gap-1">
                                                        <ExternalLink className="w-3 h-3" /> {k}
                                                    </a>
                                                ))}
                                            </div>

                                            <div className="grid sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm text-gray-300 block mb-1.5">Headline</label>
                                                    <input
                                                        value={e.headline}
                                                        onChange={(ev) => setEdits((prev) => ({ ...prev, [f.id]: { ...getEdit(f), headline: ev.target.value } }))}
                                                        className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/60"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm text-gray-300 block mb-1.5">URL slug <span className="text-gray-500">(Google indexes this)</span></label>
                                                    <input
                                                        value={e.slug}
                                                        onChange={(ev) => setEdits((prev) => ({ ...prev, [f.id]: { ...getEdit(f), slug: slugify(ev.target.value) } }))}
                                                        className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-yellow-500/60"
                                                    />
                                                    <p className="text-xs text-gray-600 mt-1">→ afropitchplay.best/featured/{e.slug || "…"}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-sm text-gray-300 block mb-1.5">Why we picked them <span className="text-gray-500">(your words, shown on the page)</span></label>
                                                <textarea
                                                    value={e.story}
                                                    onChange={(ev) => setEdits((prev) => ({ ...prev, [f.id]: { ...getEdit(f), story: ev.target.value } }))}
                                                    rows={3}
                                                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-white text-sm leading-relaxed focus:outline-none focus:border-yellow-500/60"
                                                />
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                <Button size="sm" onClick={() => saveDraft(f)} disabled={saving === f.id} className="bg-white/10 hover:bg-white/15 text-white rounded-xl">
                                                    {saving === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null} Save edits
                                                </Button>
                                                <Button size="sm" onClick={() => setStatus(f, "published")} disabled={saving === f.id} className="bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-bold">
                                                    Publish
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => deleteFeature(f)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl">
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
                    {published.map((f) => (
                        <Card key={f.id} className="border-white/10 bg-white/5">
                            <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4 flex-wrap">
                                <div className="min-w-0">
                                    <p className="text-white font-semibold">{f.artist_name}</p>
                                    <p className="text-xs text-gray-500 font-mono">/featured/{f.slug ?? "—"}</p>
                                </div>
                                <div className="flex gap-2">
                                    {f.slug && (
                                        <a href={`https://afropitchplay.best/featured/${f.slug}`} target="_blank" rel="noreferrer">
                                            <Button size="sm" variant="outline" className="border-white/15 rounded-xl">
                                                <ExternalLink className="w-3.5 h-3.5 mr-1" /> View
                                            </Button>
                                        </a>
                                    )}
                                    <Button size="sm" variant="ghost" onClick={() => setStatus(f, "draft")} className="text-gray-400 hover:text-white rounded-xl">
                                        Unpublish
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {features.length === 0 && (
                <Card className="border-dashed border-white/10 bg-white/5">
                    <CardContent className="pt-10 pb-10 text-center">
                        <p className="text-gray-400">No features yet. Create the first draft above — or pick one from Monday's shortlist.</p>
                    </CardContent>
                </Card>
            )}

            <p className="text-xs text-gray-600">
                <ChevronDown className="w-3 h-3 inline mr-1" />
                Flow: create draft → send the artist the questionnaire link → they fill bio + Q&A → you review, set the slug, publish → Google can index their page.
            </p>
        </div>
    );
}
