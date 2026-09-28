import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "African Playlists | Real Curator Playlists for Afrobeats, Amapiano & More",
  description:
    "Browse real African curator playlists on AfroPitch — Afrobeats, Amapiano, Afro-house, Alte and Francophone vibes. Pitch your song directly to the curators behind them.",
  openGraph: {
    title: "African Playlists | AfroPitch",
    description:
      "Real curator playlists across Afrobeats, Amapiano, Afro-house, Alte and more. Find your sound, pitch your song.",
    url: "https://afropitchplay.best/playlists",
  },
};

export default function PlaylistsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
