"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music, ExternalLink, Link as LinkIcon, ClipboardPaste } from "lucide-react";

// Song link field: a plain paste-the-link input with a one-tap paste button.
// (The old Spotify live-search box is gone — the search API was never
// configured on production, and pasting a URL into it swallowed the link.)
export function SongSearch({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [pasteMsg, setPasteMsg] = useState("");

  // One-tap paste: reads the clipboard and drops the copied link into the field.
  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        onChange(text.trim());
        setPasteMsg("");
      } else {
        setPasteMsg("Clipboard is empty — copy your song link first.");
      }
    } catch {
      setPasteMsg("Clipboard blocked — long-press the field and choose Paste.");
    }
    setTimeout(() => setPasteMsg(""), 4000);
  };

  return (
    <div className="space-y-2 animate-in fade-in duration-300">
      <Label className="flex items-center gap-2">
        <LinkIcon className="w-4 h-4 text-green-500" /> Song Link
      </Label>
      <div className="relative">
        <Input
          type="url"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Paste your song link here (Spotify, Apple Music, Audiomack, YouTube...)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 pr-16"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {value && <ExternalLink className="h-4 w-4 text-green-500" />}
          <button
            type="button"
            onClick={pasteFromClipboard}
            title="Paste from clipboard"
            aria-label="Paste link from clipboard"
            className="p-1.5 -m-1.5 text-gray-400 hover:text-white transition-colors"
          >
            <ClipboardPaste className="h-4 w-4" />
          </button>
        </div>
      </div>
      {pasteMsg && <p className="text-xs text-yellow-400/90">{pasteMsg}</p>}
      <p className="text-xs text-gray-500 flex items-center gap-1">
        <Music className="w-3 h-3" />
        Paste a link from Spotify, Apple Music, Audiomack, SoundCloud, BoomPlay, or YouTube
      </p>
    </div>
  );
}
