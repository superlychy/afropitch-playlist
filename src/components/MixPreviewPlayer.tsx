"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, ShieldCheck } from "lucide-react";

export const PREVIEW_MAX_SECONDS = 30;
// The platform's own voice tag plays once, at the start of the 30s preview.
const TAG_TIMES = [0.5];

/** Turn a Google Drive share link into a direct-stream URL for <audio>. */
export function toDirectAudioUrl(url: string): string {
    try {
        const u = new URL(url.trim());
        if (u.hostname.includes("drive.google.com")) {
            const m = u.pathname.match(/\/file\/d\/([^/]+)/);
            const id = m?.[1] || u.searchParams.get("id");
            if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
        }
        return url;
    } catch {
        return url;
    }
}

export function MixPreviewPlayer({
    src,
    tagSrc = "/preview-tag.mp3",
}: {
    src: string;
    tagSrc?: string;
}) {
    const songRef = useRef<HTMLAudioElement | null>(null);
    const tagRef = useRef<HTMLAudioElement | null>(null);
    const firedRef = useRef(0);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const song = songRef.current;
        const tag = tagRef.current;
        if (!song || !tag) return;

        const onTime = () => {
            const t = song.currentTime;
            setProgress(Math.min(t / PREVIEW_MAX_SECONDS, 1));
            if (t >= PREVIEW_MAX_SECONDS) {
                song.pause();
                song.currentTime = 0;
                firedRef.current = 0;
                return;
            }
            // Platform watermark: voice tag mixed over the music, 3x per preview.
            if (
                firedRef.current < TAG_TIMES.length &&
                t >= TAG_TIMES[firedRef.current]
            ) {
                firedRef.current += 1;
                song.volume = 0.3;
                tag.currentTime = 0;
                tag.play().catch(() => {
                    song.volume = 1;
                });
            }
        };
        const onTagEnd = () => {
            if (songRef.current) songRef.current.volume = 1;
        };
        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);

        song.addEventListener("timeupdate", onTime);
        song.addEventListener("play", onPlay);
        song.addEventListener("pause", onPause);
        tag.addEventListener("ended", onTagEnd);
        return () => {
            song.removeEventListener("timeupdate", onTime);
            song.removeEventListener("play", onPlay);
            song.removeEventListener("pause", onPause);
            tag.removeEventListener("ended", onTagEnd);
        };
    }, []);

    const toggle = () => {
        const s = songRef.current;
        if (!s) return;
        if (s.paused) {
            if (s.currentTime >= PREVIEW_MAX_SECONDS - 0.5) {
                s.currentTime = 0;
                firedRef.current = 0;
            }
            s.play().catch(() => {});
        } else {
            s.pause();
        }
    };

    const secs = Math.floor(progress * PREVIEW_MAX_SECONDS);

    return (
        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
            <div className="flex items-center gap-3">
                <button
                    onClick={toggle}
                    className="w-11 h-11 rounded-full bg-green-500 hover:bg-green-400 text-black flex items-center justify-center flex-shrink-0 transition-colors"
                    aria-label={playing ? "Pause preview" : "Play preview"}
                >
                    {playing ? (
                        <Pause className="w-5 h-5" />
                    ) : (
                        <Play className="w-5 h-5 ml-0.5" />
                    )}
                </button>
                <div className="flex-1">
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                            className="h-full bg-green-400 rounded-full"
                            style={{ width: `${progress * 100}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-gray-400">
                            0:{String(secs).padStart(2, "0")} / 0:30 preview
                        </span>
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Watermarked
                        </span>
                    </div>
                </div>
            </div>
            {/* No native controls on purpose: no download button, no seeking past the 30s preview. */}
            <audio ref={songRef} src={toDirectAudioUrl(src)} preload="auto" />
            <audio ref={tagRef} src={tagSrc} preload="auto" />
        </div>
    );
}
