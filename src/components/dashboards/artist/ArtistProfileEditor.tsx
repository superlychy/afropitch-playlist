"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Check, Copy, ExternalLink, Loader2 } from "lucide-react";

// "My public profile" — what fans see on the artist's AfroPitch fan page.
// Photo uploads via /api/artist/upload-photo (service role -> artist-photos bucket).
// Everything else saves directly (RLS: users can update their own profile).
// Completion drives featuring eligibility: only complete profiles can be featured.
const FEATURE_QUESTIONS: { key: string; label: string; hint: string }[] = [
    { key: "story", label: "Your story", hint: "Tell fans who you are in a few lines." },
    { key: "inspiration", label: "What inspires your sound?", hint: "People, places, experiences." },
    { key: "next", label: "What's coming next?", hint: "Upcoming music, shows, plans." },
];

export function ArtistProfileEditor({ userId }: { userId: string }) {
    const { toast } = useToast();
    const fileRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [slug, setSlug] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");
    const [bio, setBio] = useState("");
    const [instagram, setInstagram] = useState("");
    const [twitter, setTwitter] = useState("");
    const [tiktok, setTiktok] = useState("");
    const [youtube, setYoutube] = useState("");
    const [website, setWebsite] = useState("");
    const [answers, setAnswers] = useState<Record<string, string>>({});

    useEffect(() => {
        (async () => {
            const { data } = await supabase
                .from("profiles")
                .select("profile_slug, photo_url, bio, instagram, twitter, tiktok, youtube, website, feature_answers")
                .eq("id", userId)
                .single();
            if (data) {
                setSlug(data.profile_slug || "");
                setPhotoUrl(data.photo_url || "");
                setBio(data.bio || "");
                setInstagram(data.instagram || "");
                setTwitter(data.twitter || "");
                setTiktok(data.tiktok || "");
                setYoutube(data.youtube || "");
                setWebsite(data.website || "");
                setAnswers((data.feature_answers as Record<string, string>) || {});
            }
            setLoading(false);
        })();
    }, [userId]);

    const completion = (() => {
        let done = 0;
        const total = 4;
        if (photoUrl) done++;
        if (bio.trim().length >= 20) done++;
        if (instagram.trim() || twitter.trim() || tiktok.trim() || youtube.trim() || website.trim()) done++;
        if (FEATURE_QUESTIONS.every((q) => (answers[q.key] || "").trim().length >= 10)) done++;
        return Math.round((done / total) * 100);
    })();

    const save = async () => {
        setSaving(true);
        const { error } = await supabase
            .from("profiles")
            .update({
                bio: bio.trim(),
                instagram: instagram.trim(),
                twitter: twitter.trim(),
                tiktok: tiktok.trim(),
                youtube: youtube.trim(),
                website: website.trim(),
                feature_answers: answers,
                updated_at: new Date().toISOString(),
            })
            .eq("id", userId);
        setSaving(false);
        if (error) toast("Could not save your profile.", "error");
        else toast("Profile saved.");
    };

    const uploadPhoto = async (file: File) => {
        setUploading(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch("/api/artist/upload-photo", { method: "POST", body: form });
            const json = await res.json().catch(() => null);
            if (json?.ok && json.url) {
                setPhotoUrl(json.url);
                toast("Photo uploaded.");
            } else {
                toast(json?.error || "Upload failed.", "error");
            }
        } catch {
            toast("Upload failed.", "error");
        }
        setUploading(false);
    };

    const fanUrl = slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/artist/${slug}` : "";

    if (loading) return <p className="text-zinc-500 text-sm">Loading your profile...</p>;

    return (
        <div className="bg-[#141417] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-[15px] font-bold text-white">My public profile</h2>
                    <p className="text-zinc-500 text-xs mt-1">
                        This is what fans see when they open your song link. Complete profiles can be featured.
                    </p>
                </div>
                {fanUrl && (
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(fanUrl).catch(() => {});
                                setCopied(true);
                                setTimeout(() => setCopied(false), 1500);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#22C55E] border border-[#22C55E]/30 rounded-xl px-3 py-2"
                        >
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? "Copied" : "Copy fan link"}
                        </button>
                        <a
                            href={fanUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-300 border border-white/10 rounded-xl px-3 py-2"
                        >
                            <ExternalLink className="w-3.5 h-3.5" /> View
                        </a>
                    </div>
                )}
            </div>

            {/* Completion */}
            <div>
                <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-zinc-400">Profile completion</span>
                    <span className={`font-bold ${completion === 100 ? "text-[#22C55E]" : "text-yellow-400"}`}>{completion}%</span>
                </div>
                <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-600 to-emerald-400 rounded-full transition-all" style={{ width: `${completion}%` }} />
                </div>
                {completion < 100 && (
                    <p className="text-zinc-500 text-xs mt-1.5">Add a photo, a short bio, one social link and the 3 questions to reach 100% and become eligible for featuring.</p>
                )}
            </div>

            {/* Photo */}
            <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-zinc-800 border border-white/10 shrink-0 flex items-center justify-center">
                    {photoUrl ? (
                        <img src={photoUrl} alt="Artist photo" className="w-full h-full object-cover" />
                    ) : (
                        <Camera className="w-7 h-7 text-zinc-600" />
                    )}
                </div>
                <div>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void uploadPhoto(f);
                            e.target.value = "";
                        }}
                    />
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="inline-flex items-center gap-2 text-sm font-bold text-white bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl px-4 py-2.5 disabled:opacity-50"
                    >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                        {uploading ? "Uploading..." : photoUrl ? "Change photo" : "Upload photo"}
                    </button>
                    <p className="text-zinc-600 text-[11px] mt-1.5">JPG, PNG or WebP, max 4MB.</p>
                </div>
            </div>

            {/* Bio */}
            <div>
                <Label className="text-zinc-300 text-xs">Bio</Label>
                <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    maxLength={400}
                    placeholder="Who are you? Say it in a line or two — this shows on your fan page."
                    className="mt-1.5 w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#22C55E]/50"
                />
            </div>

            {/* Socials */}
            <div>
                <Label className="text-zinc-300 text-xs">Social handles</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1.5">
                    {[
                        { label: "Instagram", value: instagram, set: setInstagram, ph: "@yourhandle" },
                        { label: "X (Twitter)", value: twitter, set: setTwitter, ph: "@yourhandle" },
                        { label: "TikTok", value: tiktok, set: setTiktok, ph: "@yourhandle" },
                        { label: "YouTube", value: youtube, set: setYoutube, ph: "channel link or handle" },
                    ].map((s) => (
                        <div key={s.label}>
                            <span className="text-[11px] text-zinc-500">{s.label}</span>
                            <Input
                                value={s.value}
                                onChange={(e) => s.set(e.target.value)}
                                placeholder={s.ph}
                                className="mt-1 bg-zinc-900 border-white/10 text-sm"
                            />
                        </div>
                    ))}
                </div>
                <div className="mt-2.5">
                    <span className="text-[11px] text-zinc-500">Website</span>
                    <Input
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://..."
                        className="mt-1 bg-zinc-900 border-white/10 text-sm"
                    />
                </div>
            </div>

            {/* Feature questions */}
            <div>
                <Label className="text-zinc-300 text-xs">Feature questions</Label>
                <p className="text-zinc-500 text-[11px] mt-0.5 mb-2">Answer once — we use these if you get featured, so we never have to chase you.</p>
                <div className="space-y-3">
                    {FEATURE_QUESTIONS.map((q) => (
                        <div key={q.key}>
                            <span className="text-[11px] text-zinc-400 font-semibold">{q.label}</span>
                            <textarea
                                value={answers[q.key] || ""}
                                onChange={(e) => setAnswers((p) => ({ ...p, [q.key]: e.target.value }))}
                                rows={2}
                                placeholder={q.hint}
                                className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#22C55E]/50"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <button
                onClick={save}
                disabled={saving}
                className="w-full bg-[#22C55E] hover:bg-[#1aa34e] disabled:opacity-50 text-[#04120a] font-extrabold text-sm py-3 rounded-xl"
            >
                {saving ? "Saving..." : "Save profile"}
            </button>
        </div>
    );
}
