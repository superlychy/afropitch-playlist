import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: p } = await sb
      .from("playlists")
      .select("name, description, cover_image, followers")
      .eq("id", id)
      .single();

    if (p?.name) {
      const followers =
        typeof p.followers === "number" && p.followers > 0
          ? ` (${p.followers.toLocaleString()} followers)`
          : "";
      const description =
        p.description ||
        `Listen to ${p.name}${followers} — a curated African music playlist on AfroPitch. Artists: pitch your song to this curator.`;
      return {
        title: `${p.name} | AfroPitch Playlist`,
        description,
        openGraph: {
          title: `${p.name} | AfroPitch`,
          description,
          url: `https://afropitchplay.best/playlist/${id}`,
          ...(p.cover_image ? { images: [{ url: p.cover_image, alt: p.name }] } : {}),
        },
        twitter: {
          card: "summary_large_image",
          title: `${p.name} | AfroPitch`,
          description,
          ...(p.cover_image ? { images: [p.cover_image] } : {}),
        },
      };
    }
  } catch {
    // fall through to generic playlist metadata
  }
  return {
    title: "Playlist | AfroPitch",
    description:
      "Discover a curated African music playlist on AfroPitch — Afrobeats, Amapiano, Afro-house and more. Artists can pitch their songs directly to curators.",
  };
}

export default function PlaylistDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
