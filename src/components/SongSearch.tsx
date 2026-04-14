"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music, Search, ExternalLink, Loader2, Link as LinkIcon } from "lucide-react";

interface Song {
  id: string; name: string; artists: string; album: string;
  albumImage: string | null; spotifyUrl: string | null;
  duration: number; isrc: string | null;
}

export function SongSearch({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Song | null>(null);
  const [show, setShow] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(true);
  const [notConfigured, setNotConfigured] = useState(false);
  const debounceRef = useRef<any>();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setShow(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 3) { setResults([]); setShow(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search-song?q=${encodeURIComponent(query)}`);
        const d = await r.json();
        if (d.message && d.message.includes("not configured")) {
          setSearchEnabled(false);
          setNotConfigured(true);
          setResults([]);
        } else {
          setResults(d.results || []);
          setShow(true);
        }
      } catch { setResults([]); }
      setLoading(false);
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const select = (s: Song) => {
    setSelected(s);
    setQuery(`${s.name} — ${s.artists}`);
    setShow(false);
    onChange(s.spotifyUrl || "");
  };

  const clear = () => {
    setSelected(null); setQuery(""); onChange(""); setResults([]); setShow(false);
  };

  const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

  // If Spotify search is not configured, show simple link input
  if (notConfigured) {
    return (
      <div className="space-y-2 animate-in fade-in duration-300" ref={ref}>
        <Label className="flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-green-500" /> Song Link
        </Label>
        <div className="relative">
          <Input
            type="url"
            placeholder="Paste your song link here (Spotify, Apple Music, Audiomack, YouTube...)"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 pr-10"
          />
          {value && (
            <ExternalLink className="absolute right-3 top-2.5 h-4 w-4 text-green-500" />
          )}
        </div>
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Music className="w-3 h-3" />
          Paste a link from Spotify, Apple Music, Audiomack, SoundCloud, BoomPlay, or YouTube
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-in fade-in duration-300" ref={ref}>
      <Label className="flex items-center gap-2">
        <Music className="w-4 h-4 text-green-500" /> Find Your Song
      </Label>

      {selected ? (
        <div className="flex items-center gap-3 p-3 bg-green-950/30 border border-green-500/30 rounded-xl animate-in fade-in zoom-in duration-200">
          {selected.albumImage && <img src={selected.albumImage} alt="" className="w-12 h-12 rounded-lg shadow-lg" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{selected.name}</p>
            <p className="text-xs text-gray-400 truncate">{selected.artists} • {selected.album}</p>
          </div>
          <button type="button" onClick={clear} className="text-gray-400 hover:text-white text-xs underline transition-colors">
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search Spotify (e.g. Burna Boy Last Last)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (results.length > 0) setShow(true); }}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
          {loading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-gray-500 animate-spin" />}
        </div>
      )}

      {/* Search Results Dropdown */}
      {show && results.length > 0 && !selected && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          {results.map((s, i) => (
            <div
              key={s.id}
              className="flex items-center gap-3 p-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0 transition-colors"
              style={{ animationDelay: `${i * 30}ms` }}
              onClick={() => select(s)}
            >
              {s.albumImage ? (
                <img src={s.albumImage} alt="" className="w-10 h-10 rounded-lg shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <Music className="w-5 h-5 text-gray-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{s.name}</p>
                <p className="text-xs text-gray-400 truncate">{s.artists}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-500">{fmt(s.duration)}</span>
                {s.spotifyUrl && <ExternalLink className="w-3 h-3 text-green-500" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {show && results.length === 0 && !loading && query.length >= 3 && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-4 text-center animate-in fade-in duration-200">
          <Music className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No songs found. Try another search or paste the link below.</p>
        </div>
      )}

      {/* Fallback Manual Link */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <Label className="text-xs text-gray-500 flex items-center gap-1">
          <LinkIcon className="w-3 h-3" /> Or paste link directly
        </Label>
        <Input
          type="url"
          placeholder="https://open.spotify.com/track/..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-sm mt-1"
        />
      </div>
    </div>
  );
}
