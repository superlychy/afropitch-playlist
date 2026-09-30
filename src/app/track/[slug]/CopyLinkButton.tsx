'use client';

export default function CopyLinkButton({ url }: { url: string }) {
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(url); }}
      className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-full font-bold text-sm transition-all hover:scale-105 cursor-pointer"
    >
      Copy Link
    </button>
  );
}
