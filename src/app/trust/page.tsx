import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, UserCheck, BarChart } from "lucide-react";

export default function TrustPage() {
    return (
        <div className="container mx-auto max-w-4xl px-4 py-16 md:py-24 space-y-16">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    Trust & Safety
                </h1>
                <p className="text-xl text-gray-400">
                    Why AfroPitch Playlist is the safest way to promote your music.
                </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                {[
                    {
                        title: "100% Real Reviews",
                        desc: "Our playlist curators are vetted humans, not scripts. Every song is listened to.",
                        icon: UserCheck
                    },
                    {
                        title: "No Bot Policy",
                        desc: "We strictly prohibit bot streams. We prioritize organic growth and real fan engagement.",
                        icon: ShieldCheck
                    },
                    {
                        title: "Data Driven",
                        desc: "We use AntiGravity's trusted platform to ensure secure handling of your submission data.",
                        icon: BarChart
                    }
                ].map((item, i) => (
                    <Card key={i} className="bg-white/5 border-white/10">
                        <CardContent className="pt-6 text-center space-y-4">
                            <div className="mx-auto w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                                <item.icon className="w-6 h-6 text-green-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white">{item.title}</h3>
                            <p className="text-gray-400 text-sm">
                                {item.desc}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="prose prose-invert max-w-none">
                <h2 className="text-2xl font-bold text-white mb-4">How Playlist Reviews Really Work</h2>
                <p className="text-gray-300 mb-4">
                    Many artists fall victim to "pay for placement" scams which result in bot streams and potential bans from Spotify.
                    AfroPitch Playlist operates differently:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li>You pay for the time and effort of a professional curator to review your song.</li>
                    <li>Placement is <strong>never guaranteed</strong>. It depends solely on the quality and fit of the track.</li>
                    <li>If your song is accepted, it is added to our high-quality, organic playlists.</li>
                    <li>If not accepted, you receive honest, constructive feedback to help you improve.</li>
                </ul>
            </div>
        </div>
    );
}
