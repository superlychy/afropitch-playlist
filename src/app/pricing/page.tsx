import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Zap, Crown, Star, ArrowRight } from "lucide-react";
import { pricingConfig } from "@/../config/pricing";

export default function PricingPage() {
    const { currency, tiers } = pricingConfig;

    return (
        <div className="w-full mx-auto max-w-7xl px-4 py-16 md:py-24 flex flex-col items-center justify-center min-h-[80vh]">
            <div className="text-center space-y-4 mb-16 max-w-2xl">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    Choose Your <span className="text-green-400">Speed</span>
                </h1>
                <p className="text-xl text-gray-400">
                    Transparent pricing for every budget.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 justify-center items-stretch w-full max-w-6xl">
                {/* Free Tier */}
                <Card className="group flex flex-col border-blue-500/20 bg-gradient-to-b from-blue-950/20 to-black/60 backdrop-blur-md relative overflow-hidden hover:border-blue-500/40 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10">
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardHeader className="pb-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
                            <Star className="w-5 h-5 text-blue-400" />
                        </div>
                        <CardTitle className="text-xl">{tiers.free.title}</CardTitle>
                        <CardDescription className="text-sm">{tiers.free.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5 flex-grow pt-2">
                        <div className="flex items-baseline text-white">
                            <span className="text-4xl font-extrabold tracking-tight">FREE</span>
                        </div>
                        <ul className="space-y-2.5 text-left">
                            {tiers.free.features.map((feature, i) => (
                                <li key={i} className="flex items-start gap-2.5">
                                    <Check className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-gray-400">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter className="pt-2">
                        <Link href={`/submit?tier=free`} className="w-full">
                            <Button variant="outline" className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all duration-300 rounded-xl group/btn">
                                Submit Free <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>

                {/* Standard Tier */}
                <Card className="group flex flex-col border-white/10 bg-gradient-to-b from-white/5 to-black/60 backdrop-blur-md relative overflow-hidden hover:border-white/20 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-white/5">
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardHeader className="pb-2">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3">
                            <Zap className="w-5 h-5 text-gray-400" />
                        </div>
                        <CardTitle className="text-xl">{tiers.standard.title}</CardTitle>
                        <CardDescription className="text-sm">{tiers.standard.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5 flex-grow pt-2">
                        <div className="flex items-baseline text-white">
                            <span className="text-4xl font-extrabold tracking-tight">{currency}{tiers.standard.price.toLocaleString()}</span>
                        </div>
                        <ul className="space-y-2.5 text-left">
                            {tiers.standard.features.map((feature, i) => (
                                <li key={i} className="flex items-start gap-2.5">
                                    <Check className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-gray-400">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter className="pt-2">
                        <Link href={`/submit?tier=${tiers.standard.id}`} className="w-full">
                            <Button variant="outline" className="w-full border-white/20 text-gray-300 hover:bg-white hover:text-black hover:border-white transition-all duration-300 rounded-xl group/btn">
                                {tiers.standard.duration.replace("Hours", "hr")} <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>

                {/* Express Tier — Recommended */}
                <Card className="group flex flex-col border-green-500/30 bg-gradient-to-b from-green-950/30 to-black/60 backdrop-blur-md shadow-[0_0_30px_rgba(22,163,74,0.05)] hover:shadow-[0_0_50px_rgba(22,163,74,0.15)] relative overflow-hidden hover:-translate-y-2 transition-all duration-500">
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-green-500 to-transparent" />
                    <div className="absolute top-3 right-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg shadow-green-500/30">
                        RECOMMENDED
                    </div>
                    <CardHeader className="pb-2">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-3">
                            <Zap className="w-5 h-5 text-green-400" />
                        </div>
                        <CardTitle className="text-xl">{tiers.express.title}</CardTitle>
                        <CardDescription className="text-sm">{tiers.express.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5 flex-grow pt-2">
                        <div className="flex items-baseline text-white">
                            <span className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">{currency}{tiers.express.price.toLocaleString()}</span>
                        </div>
                        <ul className="space-y-2.5 text-left">
                            {tiers.express.features.map((feature, i) => (
                                <li key={i} className="flex items-start gap-2.5">
                                    <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-gray-300">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter className="pt-2">
                        <Link href={`/submit?tier=${tiers.express.id}`} className="w-full">
                            <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-300 group/btn">
                                {tiers.express.duration.replace("Hours", "hr")} <ArrowRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-all" />
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>

                {/* Exclusive Tier */}
                <Card className="group flex flex-col border-yellow-500/20 bg-gradient-to-b from-yellow-950/20 to-black/60 backdrop-blur-md relative overflow-hidden hover:border-yellow-500/40 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-yellow-500/10">
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardHeader className="pb-2">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center mb-3">
                            <Crown className="w-5 h-5 text-yellow-400" />
                        </div>
                        <CardTitle className="text-xl">{tiers.exclusive.title}</CardTitle>
                        <CardDescription className="text-sm">{tiers.exclusive.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5 flex-grow pt-2">
                        <div className="flex items-baseline text-white">
                            <span className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-yellow-400 to-amber-300 bg-clip-text text-transparent">{currency}{tiers.exclusive.price.toLocaleString()}</span>
                        </div>
                        <ul className="space-y-2.5 text-left">
                            {tiers.exclusive.features.map((feature, i) => (
                                <li key={i} className="flex items-start gap-2.5">
                                    <Check className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-gray-400">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter className="pt-2">
                        <Link href={`/submit?tier=exclusive`} className="w-full">
                            <Button className="w-full bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-black font-semibold rounded-xl shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 transition-all duration-300 group/btn">
                                Get Exclusive <Crown className="w-4 h-4 ml-1 group-hover/btn:rotate-12 transition-all" />
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>

            <p className="mt-12 text-sm text-gray-500 text-center">
                Secure payment via Paystack. <br />
                Accepted: Debit Card, Bank Transfer, USSD.
            </p>
        </div >
    );
}
