import Link from "next/link";
import { ArtistSocials, type ArtistProfile } from "./ArtistCard";

// The artist page: photo, bio, socials.
// The bio always shows; feature Q&A answers are reserved for Spotlight features.
export function ArtistFanPage({ profile }: { profile: ArtistProfile }) {
    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                <div className="w-32 h-32 rounded-3xl overflow-hidden bg-zinc-800 border border-white/10 shrink-0 flex items-center justify-center">
                    {profile.photo_url ? (
                        <img src={profile.photo_url} alt={profile.full_name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-4xl font-bold text-zinc-600">
                            {profile.full_name.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>
                <div className="min-w-0">
                    <h1 className="text-3xl font-extrabold text-white">{profile.full_name}</h1>
                    {profile.bio && <p className="text-zinc-400 text-sm mt-2 max-w-xl">{profile.bio}</p>}
                    <ArtistSocials profile={profile} className="mt-4 justify-center sm:justify-start" />
                </div>
            </div>

            <p className="text-center text-zinc-600 text-xs mt-12">
                Discover African music on <Link href="/" className="text-zinc-400 font-semibold">AfroPitch</Link>
            </p>
        </div>
    );
}
