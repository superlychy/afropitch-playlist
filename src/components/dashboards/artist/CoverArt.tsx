"use client";

import { Music2 } from "lucide-react";

// Song artwork: the real Spotify cover when available, otherwise the
// branded AfroPitch gradient placeholder with a music icon.
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
  const style = {
    width: size,
    height: size,
    borderRadius: rounded,
  } as const;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} style={style} className="shrink-0 object-cover" loading="lazy" />;
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
