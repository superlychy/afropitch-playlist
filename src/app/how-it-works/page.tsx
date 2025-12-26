import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadCloud, CreditCard, Headphones, MessageSquare } from "lucide-react";
import { pricingConfig } from "@/../config/pricing";

const steps = [
    {
        order: 1,
        title: "Submit Your Song",
        description: "Fill out the simple form with your track link (Spotify, Apple Music, etc.) and artist details.",
        icon: UploadCloud,
    },
    {
        order: 2,
        title: `Pay ${pricingConfig.currency}${pricingConfig.tiers.standard.price.toLocaleString()}`,
        description: "Secure one-time payment for a professional review. No hidden subscriptions.",
        icon: CreditCard,
    },
    {
        order: 3,
        title: "We Review & Pitch",
        description: `Our curation team listens to your track within ${pricingConfig.tiers.standard.duration} (or faster). No bots, just ears.`,
        icon: Headphones,
    },
    {
        order: 4,
        title: "Get Results",
        description: "Receive detailed feedback or a playlist placement confirmation directly to your email.",
        icon: MessageSquare,
    },
];

export default function HowItWorksPage() {
    return (
        <div className="w-full mx-auto max-w-5xl px-4 py-16 md:py-24">
            <div className="text-center mb-16 space-y-4">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    How <span className="text-green-500">AfroPitch</span> Works
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    We've simplified the playlist pitching process into 4 easy steps.
                </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 relative">
                {/* Connector Line (Desktop) */}
                <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-green-500/20 via-orange-500/20 to-green-500/20 -z-10" />

                {steps.map((step) => (
                    <div key={step.order} className="relative group">
                        <Card className="h-full border-white/10 bg-black/40 backdrop-blur-sm hover:border-green-500/50 transition-colors">
                            <CardHeader className="text-center pb-2">
                                <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-green-900 to-green-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <step.icon className="w-6 h-6 text-green-400 " />
                                </div>
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                                    Step 0{step.order}
                                </div>
                                <CardTitle className="text-lg">{step.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-center text-gray-400 text-sm">
                                {step.description}
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>

            {/* Money-back Guarantee / Escrow Info */}
            <div className="mt-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-8 md:p-12 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                    <div className="bg-blue-500/20 p-4 rounded-full shrink-0">
                        <CreditCard className="w-8 h-8 text-blue-400" />
                    </div>
                    <div className="space-y-4 text-center md:text-left">
                        <h2 className="text-2xl md:text-3xl font-bold text-white">100% Money-Back Guarantee</h2>
                        <p className="text-gray-300 text-lg leading-relaxed">
                            Your funds are held in <span className="text-white font-bold">Escrow</span> until the curator reviews your song.
                            <br className="hidden md:block" />
                            If your song is active on a playlist but not showing, or if you are declined, the submission fee is automatically returned to your wallet.
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm font-medium text-blue-300">
                            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> No Risk</span>
                            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Instant Refund</span>
                            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Secure</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-16 text-center bg-white/5 rounded-2xl p-8 border border-white/10">
                <h3 className="text-2xl font-bold text-white mb-4">Ready to be heard?</h3>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                    Join hundreds of Afro-artists getting their music in front of real curators today.
                </p>
                <Link href="/submit">
                    <Button size="lg" className="bg-green-600 hover:bg-green-700 text-lg px-8 py-6 rounded-full">
                        Submit Your Song
                    </Button>
                </Link>
            </div>
        </div>
    );
}
