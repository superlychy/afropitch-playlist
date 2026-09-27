import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MixingOrderForm } from "@/components/MixingOrderForm";
import { Button } from "@/components/ui/button";
import {
    Upload,
    CreditCard,
    AudioWaveform,
    Play,
    BadgeCheck,
    ShieldCheck,
    ArrowRight,
    Music4,
} from "lucide-react";

export const metadata: Metadata = {
    title: "Professional Song Mixing Service for African Artists | AfroPitch",
    description:
        "Get your Afrobeats, Amapiano or Afro-house track professionally mixed. Escrow-protected payment, watermarked previews — pay only when you love the mix.",
    keywords: [
        "song mixing service Nigeria",
        "afrobeats mixing engineer",
        "amapiano mixing and mastering",
        "music mixing service Africa",
        "online mixing engineer",
        "afro house mix engineer",
        "AfroPitch mixing",
    ],
    openGraph: {
        title: "AfroPitch Mixing Service — Radio-ready mixes for African artists",
        description:
            "Professional mixing with escrow protection: your money is only released when you accept the finished mix.",
        url: "https://afropitchplay.best/mixing",
        type: "website",
    },
};

const faqs = [
    {
        q: "How does the escrow payment work?",
        a: "You pay upfront, but your money is held in escrow — not sent to the engineer. When the mix is done you get a watermarked 60-second preview. Only when you accept the mix is the payment released. If you're not satisfied, the full amount is refunded to your AfroPitch wallet, which you can withdraw to your bank account.",
    },
    {
        q: "What files should I upload?",
        a: "Upload your song to Google Drive (set sharing to “Anyone with the link”) and paste the link when ordering. Stems (WAV) give the best results, but a clean stereo bounce works for the Demo Polish package.",
    },
    {
        q: "What are stems?",
        a: "Stems are the separate parts of your song \u2014 lead vocals, backing vocals, drums, bass, instruments \u2014 each exported as its own audio file. They give the engineer control over every layer, which is the difference between a quick polish and a true professional mix.",
    },
    {
        q: "How do I get my stems from my producer?",
        a: "Just ask your producer to bounce each track as a separate WAV file, all starting from the same point (bar 1), with nothing on the master bus. Every producer knows how to do this \u2014 it takes a few minutes. The guide on this page walks you through exactly what to tell them.",
    },
    {
        q: "How will I review the mix?",
        a: "You'll get a 60-second preview right in your dashboard. It carries an AfroPitch voice tag played three times, so it can't be reused — the full, clean file is released only after you accept.",
    },
    {
        q: "How long does a mix take?",
        a: "Demo Polish takes about 3 days, Full Mix about 7 days, and Mix + Master about 10 days. You'll see live status updates in your dashboard.",
    },
    {
        q: "Will a better mix help my song get playlisted?",
        a: "Curators reject great songs every day because the mix can't compete sonically. A professional mix gives your song a fair shot — and many of the songs declined for mix quality come straight back through this service.",
    },
];

const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
};

const steps = [
    {
        icon: Music4,
        title: "Pick a package",
        text: "Choose the mix package that fits your song and budget.",
    },
    {
        icon: Upload,
        title: "Share your files",
        text: "Upload your song to Google Drive and paste the “Anyone with the link” URL.",
    },
    {
        icon: CreditCard,
        title: "Pay into escrow",
        text: "Your payment is held safely — the engineer only gets paid when you accept the mix.",
    },
    {
        icon: AudioWaveform,
        title: "We mix it",
        text: "An AfroPitch engineer mixes your track and sends a watermarked preview.",
    },
    {
        icon: BadgeCheck,
        title: "Accept & release",
        text: "Love it? Accept and the full file is yours. Not happy? Instant refund to your wallet.",
    },
];

export default function MixingPage() {
    return (
        <main className="w-full mx-auto max-w-7xl px-4 py-16 md:py-24">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />

            {/* Hero */}
            <div className="text-center space-y-5 mb-16 max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-950/30 px-4 py-1.5 text-sm text-green-300">
                    <ShieldCheck className="w-4 h-4" /> Escrow-protected · Pay only when you love it
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    Radio-ready <span className="text-green-400">mixes</span> for
                    African artists
                </h1>
                <p className="text-xl text-gray-400">
                    Your song deserves to compete sonically. Get it professionally
                    mixed by an AfroPitch engineer — with your money held in escrow
                    until you approve the final mix.
                </p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                    <a href="#order">
                        <Button className="bg-green-500 hover:bg-green-400 text-black rounded-xl">
                            Start your mix <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </a>
                    <a href="#how-it-works">
                        <Button variant="outline" className="rounded-xl border-white/20">
                            <Play className="w-4 h-4 mr-1" /> How it works
                        </Button>
                    </a>
                </div>
            </div>

            {/* About */}
            <section className="mb-20 max-w-3xl mx-auto space-y-4">
                <h2 className="text-3xl font-bold text-white text-center mb-6">
                    Why mixing decides whether your song gets heard
                </h2>
                <p className="text-gray-400 leading-relaxed">
                    Every week, curators on AfroPitch turn down good songs for one
                    fixable reason: the mix can't stand next to commercial releases.
                    Muddy low end, harsh vocals, drums that disappear on small
                    speakers — listeners skip in seconds, and playlist curators know it.
                </p>
                <p className="text-gray-400 leading-relaxed">
                    The AfroPitch mixing service exists to fix exactly that. Upload
                    your song, pick a package, and an engineer who understands
                    Afrobeats, Amapiano, Afro-house and Alte will mix your track to
                    a competitive, release-ready standard. And because payment sits
                    in escrow, you never pay for a mix you don't love.
                </p>
            </section>

            {/* How it works */}
            <section id="how-it-works" className="mb-20">
                <h2 className="text-3xl font-bold text-white text-center mb-10">
                    How it works
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {steps.map((s, i) => (
                        <div
                            key={i}
                            className="rounded-2xl border border-white/10 bg-white/5 p-5"
                        >
                            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-3">
                                <s.icon className="w-5 h-5 text-green-400" />
                            </div>
                            <div className="text-xs text-gray-500 mb-1">Step {i + 1}</div>
                            <div className="font-semibold text-white mb-1">{s.title}</div>
                            <p className="text-sm text-gray-400">{s.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Stems explainer */}
            <section className="mb-20 max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold text-white text-center mb-6">
                    What are stems? And how do you get yours?
                </h2>
                <p className="text-gray-400 leading-relaxed mb-4">
                    <span className="text-white font-semibold">Stems</span> are the
                    individual parts of your song, each exported as its own audio
                    file \u2014 for example: lead vocals, backing vocals, drums,
                    bass, synths and effects. Instead of one finished bounce, your
                    engineer gets every layer separately, so each one can be
                    balanced, cleaned and placed properly. That is what turns a
                    decent recording into a radio-ready mix.
                </p>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                    <h3 className="font-semibold text-white mb-4">
                        How to get your stems from your producer
                    </h3>
                    <ol className="space-y-4 text-sm text-gray-400">
                        {[
                            ["Ask for \u201cstems\u201d by name", "Every producer knows this term. Just say: \u201cPlease bounce each track separately as WAV files.\u201d"],
                            ["Everything starts at the same point", "Each file must start from bar 1 (00:00) \u2014 even if the instrument only enters later. That way everything lines up perfectly."],
                            ["WAV, 24-bit, no master-bus effects", "Tell them to turn off any limiter or compressor on the master bus before bouncing. We need the raw tracks, not a squashed mix."],
                            ["Label every file clearly", "\u201c01 Lead Vocal.wav\u201d, \u201c02 Backing Vocals.wav\u201d, \u201c03 Drums.wav\u201d\u2026 Clear names mean no guessing and a faster mix."],
                            ["Zip it and share a Drive link", "Put all the WAVs in one folder, zip it, upload to Google Drive with \u201cAnyone with the link\u201d, and paste the link when you order."],
                        ].map(([t, d], i) => (
                            <li key={i} className="flex gap-3">
                                <span className="shrink-0 w-6 h-6 rounded-full bg-green-500/15 text-green-400 text-xs font-bold flex items-center justify-center">
                                    {i + 1}
                                </span>
                                <div>
                                    <span className="text-white font-medium">{t}. </span>
                                    {d}
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
                <p className="text-gray-500 text-sm mt-4 text-center">
                    No stems? No problem \u2014 a clean stereo bounce works for the
                    Demo Polish package. Full Mix and Mix + Master need stems to do
                    the job properly.
                </p>
            </section>

            {/* Order */}
            <section id="order" className="mb-20 max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-white text-center mb-2">
                    Order your mix
                </h2>
                <p className="text-gray-400 text-center mb-10">
                    Takes two minutes. Your payment is protected from the first click.
                </p>
                <Suspense fallback={<div className="text-gray-500 text-center">Loading…</div>}>
                    <MixingOrderForm />
                </Suspense>
            </section>

            {/* FAQ */}
            <section className="max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold text-white text-center mb-10">
                    Questions, answered
                </h2>
                <div className="space-y-4">
                    {faqs.map((f, i) => (
                        <div
                            key={i}
                            className="rounded-2xl border border-white/10 bg-white/5 p-5"
                        >
                            <h3 className="font-semibold text-white mb-2">{f.q}</h3>
                            <p className="text-sm text-gray-400 leading-relaxed">{f.a}</p>
                        </div>
                    ))}
                </div>
                <p className="text-center text-gray-500 text-sm mt-10">
                    Still curious?{" "}
                    <Link href="/contact" className="text-green-400 hover:underline">
                        Talk to us
                    </Link>
                    .
                </p>
            </section>
        </main>
    );
}
