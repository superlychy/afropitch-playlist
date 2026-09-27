import type { Metadata } from "next";
import { FeaturedArtistView } from "@/components/FeaturedArtistView";

export const metadata: Metadata = {
    title: "Featured Artist of the Week | AfroPitch",
    description:
        "Every week AfroPitch spotlights one African artist on the rise — their story, their sound, and the song you need to hear.",
    keywords: [
        "african artist spotlight",
        "afrobeats artist of the week",
        "amapiano new artists",
        "AfroPitch featured artist",
    ],
    openGraph: {
        title: "Featured Artist of the Week | AfroPitch",
        description:
            "One African artist on the rise, spotlighted every week.",
        url: "https://afropitchplay.best/featured",
        type: "website",
    },
};

export default function FeaturedPage() {
    return (
        <main className="w-full mx-auto max-w-4xl px-4 py-16 md:py-24">
            <div className="text-center space-y-4 mb-12">
                <div className="inline-block rounded-full border border-yellow-500/30 bg-yellow-950/30 px-4 py-1.5 text-sm text-yellow-300">
                    ⭐ Featured Artist of the Week
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    This week's <span className="text-yellow-400">spotlight</span>
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Every week we pick one African artist on the rise — not just the
                    numbers, but the sound, the story, and the staying power.
                </p>
            </div>
            <FeaturedArtistView />
        </main>
    );
}
