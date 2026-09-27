"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Loader2, Star, ImagePlus } from "lucide-react";

interface QuestionnaireData {
    artist_name: string | null;
    song_title: string | null;
    headline: string | null;
    bio: string | null;
    qa: { q: string; a: string }[] | null;
    photo_url: string | null;
    questionnaire_completed_at: string | null;
}

const QUESTIONS = [
    {
        key: "influences",
        label: "Who are your biggest musical influences?",
        placeholder: "e.g. Burna Boy, Tems, my grandmother's highlife records…",
    },
    {
        key: "song_story",
        label: "What is the story behind this song?",
        placeholder: "Where were you, what were you feeling, what do you want listeners to take from it?",
    },
    {
        key: "whats_next",
        label: "What's next for you?",
        placeholder: "Upcoming releases, shows, collaborations — anything fans should watch for.",
    },
];

export function FeaturedQuestionnaireForm({
    token,
    initial,
}: {
    token: string;
    initial: QuestionnaireData;
}) {
    const [bio, setBio] = useState(initial.bio ?? "");
    const [answers, setAnswers] = useState<Record<string, string>>(() => {
        const map: Record<string, string> = {};
        const existing = initial.qa ?? [];
        for (const item of existing) {
            const q = QUESTIONS.find((qq) => qq.label === item.q);
            if (q) map[q.key] = item.a;
        }
        return map;
    });
    const [photoUrl, setPhotoUrl] = useState(initial.photo_url ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Shrink the photo in the browser before upload so files stay tiny.
    const compressImage = async (file: File): Promise<Blob> => {
        const img = await createImageBitmap(file);
        const maxDim = 1200;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not process the photo.");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((res) =>
            canvas.toBlob(res, "image/jpeg", 0.82)
        );
        if (!blob) throw new Error("Could not process the photo.");
        return blob;
    };

    const handlePhotoFile = async (f: File | undefined | null) => {
        if (!f) return;
        setUploadError(null);
        if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
            setUploadError("Please choose a JPG, PNG or WebP photo.");
            return;
        }
        setUploading(true);
        try {
            const blob = await compressImage(f);
            const fd = new FormData();
            fd.append("file", blob, "photo.jpg");
            fd.append("token", token);
            const res = await fetch("/api/featured/upload-photo", { method: "POST", body: fd });
            const json = await res.json().catch(() => null);
            if (!json?.ok) throw new Error(json?.error || "Upload failed. Please try again.");
            setPhotoUrl(json.url);
        } catch (e: any) {
            setUploadError(e?.message || "Upload failed. You can paste a link instead.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const songLabel = initial.song_title ? `“${initial.song_title}”` : "your song";
    const questions = QUESTIONS.map((q) =>
        q.key === "song_story" ? { ...q, label: `What is the story behind ${songLabel}?` } : q
    );

    const handleSubmit = async () => {
        setError(null);
        if (bio.trim().length < 40) {
            setError("Please write a little more for your bio — at least a couple of sentences so fans get to know you.");
            return;
        }
        setSaving(true);
        const qa = questions
            .map((q) => ({ q: q.label, a: (answers[q.key] ?? "").trim() }))
            .filter((item) => item.a.length > 0);
        const { data, error } = await supabase.rpc("submit_featured_questionnaire", {
            p_token: token,
            p_bio: bio.trim(),
            p_qa: qa,
            p_photo_url: photoUrl.trim(),
        });
        setSaving(false);
        if (error || !data) {
            setError("Something went wrong saving your answers. Please try again.");
            return;
        }
        setDone(true);
    };

    if (done) {
        return (
            <Card className="border-green-500/30 bg-gradient-to-b from-green-950/20 to-black/60 max-w-2xl mx-auto">
                <CardContent className="pt-10 pb-10 text-center space-y-4">
                    <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto" />
                    <h2 className="text-2xl font-bold text-white">You're all set!</h2>
                    <p className="text-gray-400 max-w-md mx-auto">
                        Thanks{initial.artist_name ? `, ${initial.artist_name}` : ""}. Our team will
                        review your feature and publish it on AfroPitch. We'll let you know
                        the moment it's live.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-3">
                <div className="inline-block rounded-full border border-yellow-500/30 bg-yellow-950/30 px-4 py-1.5 text-sm text-yellow-300">
                    <Star className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                    Featured Artist
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
                    {initial.artist_name ? `${initial.artist_name}, you're our pick` : "You're our pick"}
                </h1>
                <p className="text-gray-400">
                    AfroPitch wants to spotlight you as Featured Artist of the Week.
                    Answer a few questions below — your words will appear on your public
                    feature page, which fans can find on Google.
                </p>
                {initial.questionnaire_completed_at && (
                    <p className="text-xs text-yellow-400/80">
                        You've answered before — editing and re-submitting updates your draft.
                    </p>
                )}
            </div>

            <Card className="border-white/10 bg-white/5">
                <CardHeader>
                    <CardTitle className="text-white text-lg">Your bio</CardTitle>
                    <CardDescription>
                        A few sentences about you — where you're from, how you started, what your sound is.
                        This is the first thing fans (and Google) will read.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={5}
                        placeholder="e.g. I'm a 22-year-old Afrobeats singer from Surulere, Lagos. I started recording on my phone in 2021…"
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-yellow-500/60 text-sm leading-relaxed"
                    />
                </CardContent>
            </Card>

            {questions.map((q) => (
                <Card key={q.key} className="border-white/10 bg-white/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-white text-base font-semibold">{q.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <textarea
                            value={answers[q.key] ?? ""}
                            onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
                            rows={3}
                            placeholder={q.placeholder}
                            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-yellow-500/60 text-sm leading-relaxed"
                        />
                    </CardContent>
                </Card>
            ))}

            <Card className="border-white/10 bg-white/5">
                <CardHeader className="pb-3">
                    <CardTitle className="text-white text-base font-semibold">Your photo <span className="text-gray-500 font-normal text-sm">(optional)</span></CardTitle>
                    <CardDescription>
                        Upload a clear photo of you — it appears on your public feature page.
                        Skip this and we'll use your song's cover art instead.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {photoUrl && photoUrl.startsWith("http") && (
                        <img
                            src={photoUrl}
                            alt="Your photo preview"
                            className="w-28 h-28 rounded-xl object-cover border border-white/10"
                        />
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => handlePhotoFile(e.target.files?.[0])}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-white/15 text-white hover:bg-white/10 rounded-xl"
                    >
                        {uploading ? (
                            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading…</>
                        ) : (
                            <><ImagePlus className="w-4 h-4 mr-2" /> {photoUrl ? "Replace photo" : "Upload a photo"}</>
                        )}
                    </Button>
                    {uploadError && (
                        <p className="text-xs text-red-400">{uploadError}</p>
                    )}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-xs text-gray-500">or paste a link</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>
                    <input
                        value={photoUrl}
                        onChange={(e) => setPhotoUrl(e.target.value)}
                        placeholder="https://…"
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-yellow-500/60 text-sm"
                    />
                </CardContent>
            </Card>

            {error && (
                <p className="text-sm text-red-400 bg-red-950/30 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
            )}

            <Button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl py-6 text-base"
            >
                {saving ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Saving…</>
                ) : (
                    "Submit my feature"
                )}
            </Button>
            <p className="text-xs text-gray-600 text-center">
                Our team reviews every feature before it goes live.
            </p>
        </div>
    );
}
