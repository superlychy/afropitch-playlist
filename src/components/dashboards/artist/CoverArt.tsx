"use client";

import { useState } from "react";
import { Music2 } from "lucide-react";

// Song artwork: the real Spotify cover when available, otherwise the
// branded AfroPitch gradient placeholder with a music icon.
// A broken/expired cover URL also falls back to the placeholder.
export function CoverArt({
  src,
  alt,
  size = 56,
  rounded = 14,
}: {
  src: string | null | undefined;
  alt: string;
  size?: number;
  rounded?: number;
}) {
  const [failed, setFailed] = useState(false);
  const style = {
    width: size,
    height: size,
    borderRadius: rounded,
  } as const;
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} style={style} className="shrink-0 object-cover" loading="lazy" onError={() => setFailed(true)} />;
  }
  return (
    <div
      style={style}
      aria-label={alt}
      className="shrink-0 flex items-center justify-center bg-gradient-to-br from-[#22C55E] to-[#F59E0B]"
    >
      <Music2 style={{ width: size * 0.42, height: size * 0.42 }} className="text-[#04120a]" strokeWidth={2.2} />
    </div>
  );
}
