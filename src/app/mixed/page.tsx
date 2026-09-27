import type { Metadata } from "next";
import Link from "next/link";
import { MixedSongsView } from "@/components/MixedSongsView";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
    title: "Songs Mixed by AfroPitch | AfroPitch",
    description:
        "Listen to songs professionally mixed and mastered by AfroPitch engineers — Afrobeats, Amapiano, Afro-house and Alte, release-ready.",
    keywords: [
        "afrobeats mixing examples",
        "afropitch mixed songs",
        "professional mix before and after",
        "amapiano mixing engineer portfolio",
    ],
    openGraph: {
        title: "Mixed by AfroPitch — hear the difference",
        description:
            "Real songs, mixed and mastered by AfroPitch engineers. This is what your track could sound like.",
        url: "https://afropitchplay.best/mixed",
        type: "website",
    },
};

export default function MixedPage() {
    return (
        <main className="w-full mx-auto max-w-7xl px-4 py-16 md:py-24">
            <div className="text-center space-y-5 mb-14 max-w-3xl mx-auto">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    Mixed by <span className="text-green-400">AfroPitch</span>
                </h1>
                <p className="text-xl text-gray-400">
                    Real songs, mixed and mastered by our engineers. Press play —
                    this is what your track could sound like.
                </p>
                <Link href="/mixing">
                    <Button className="bg-green-500 hover:bg-green-400 text-black rounded-xl">
                        Get your song mixed <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                </Link>
            </div>

            <MixedSongsView />
        </main>
    );
}
