import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { pricingConfig } from "@/../config/pricing";

export default function PricingPage() {
    const { currency, tiers } = pricingConfig;

    return (
        <div className="container mx-auto max-w-6xl py-16 md:py-24 text-center">
            <div className="space-y-4 mb-16">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    Choose Your Speed
                </h1>
                <p className="text-xl text-gray-400">
                    Transparent pricing for every budget.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Standard Tier */}
                <Card className="border-white/10 bg-black/40 backdrop-blur-md relative overflow-hidden flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-2xl mb-2">{tiers.standard.title}</CardTitle>
                        <CardDescription>{tiers.standard.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 flex-grow">
                        <div className="flex justify-center items-baseline text-white">
                            <span className="text-4xl font-extrabold tracking-tight">
                                {currency}{tiers.standard.price.toLocaleString()}
                            </span>
                        </div>
                        <ul className="space-y-3 text-left">
                            {tiers.standard.features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <Check className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                    <span className="text-gray-300">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Link href={`/submit?tier=${tiers.standard.id}`} className="w-full">
                            <Button variant="outline" className="w-full border-green-500 text-green-500 hover:bg-green-500 hover:text-white py-6" size="lg">
                                Choose {tiers.standard.duration}
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>

                {/* Express Tier */}
                <Card className="border-green-500/30 bg-black/40 backdrop-blur-md shadow-[0_0_40px_rgba(22,163,74,0.1)] relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-green-500 to-orange-500" />
                    <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                        RECOMMENDED
                    </div>

                    <CardHeader>
                        <CardTitle className="text-2xl mb-2">{tiers.express.title}</CardTitle>
                        <CardDescription>{tiers.express.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 flex-grow">
                        <div className="flex justify-center items-baseline text-white">
                            <span className="text-5xl font-extrabold tracking-tight">
                                {currency}{tiers.express.price.toLocaleString()}
                            </span>
                        </div>
                        <ul className="space-y-3 text-left">
                            {tiers.express.features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    <span className="text-gray-300">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Link href={`/submit?tier=${tiers.express.id}`} className="w-full">
                            <Button className="w-full bg-green-600 hover:bg-green-700 text-lg py-6" size="lg">
                                Choose {tiers.express.duration}
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>

            <p className="mt-12 text-sm text-gray-500">
                Secure payment via Paystack/Flutterwave (Coming soon). <br />
                Accepted: Debit Card, Bank Transfer, USSD.
            </p>
        </div>
    );
}
