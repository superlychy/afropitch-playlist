// Fetches a track's cover artwork from Spotify's public oEmbed endpoint.
// No API credentials needed. Best-effort: returns null on any failure so
// callers can fall back to the branded placeholder.
export async function getSpotifyArtwork(songLink: string): Promise<string | null> {
  try {
    const lower = songLink.toLowerCase();
    if (!lower.includes("open.spotify.com/track/") && !lower.includes("spotify.com/track/")) {
      return null;
    }
    const res = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(songLink)}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const thumb = typeof data?.thumbnail_url === "string" ? data.thumbnail_url : null;
    return thumb;
  } catch {
    return null;
  }
}
