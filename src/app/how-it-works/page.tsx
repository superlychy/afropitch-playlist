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
        <div className="container mx-auto max-w-5xl px-4 py-16 md:py-24">
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
