import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { pricingConfig } from "@/../config/pricing";

export default function PricingPage() {
    const { currency, tiers } = pricingConfig;

    return (
        <div className="w-full mx-auto max-w-7xl px-4 py-16 md:py-24 flex flex-col items-center justify-center min-h-[80vh]">
            <div className="text-center space-y-4 mb-16 max-w-2xl">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    Choose Your Speed
                </h1>
                <p className="text-xl text-gray-400">
                    Transparent pricing for every budget.
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-8 justify-center items-stretch w-full max-w-5xl">
                {/* Free Tier */}
                <Card className="flex-1 border-blue-500/30 bg-black/40 backdrop-blur-md relative overflow-hidden flex flex-col max-w-md">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-transparent" />
                    <CardHeader>
                        <CardTitle className="text-2xl mb-2">{tiers.free.title}</CardTitle>
                        <CardDescription>{tiers.free.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 flex-grow">
                        <div className="flex justify-center items-baseline text-white">
                            <span className="text-4xl font-extrabold tracking-tight">
                                FREE
                            </span>
                        </div>
                        <ul className="space-y-3 text-left">
                            {tiers.free.features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <Check className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                    <span className="text-gray-300">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Link href={`/submit?tier=free`} className="w-full">
                            <Button variant="outline" className="w-full border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white py-6" size="lg">
                                Submit Free
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>

                {/* Standard Tier */}
                <Card className="flex-1 border-white/10 bg-black/40 backdrop-blur-md relative overflow-hidden flex flex-col max-w-md">
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
                <Card className="flex-1 border-green-500/30 bg-black/40 backdrop-blur-md shadow-[0_0_40px_rgba(22,163,74,0.1)] relative overflow-hidden flex flex-col max-w-md">
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


                {/* Exclusive Tier */}
                <Card className="flex-1 border-yellow-500/30 bg-black/40 backdrop-blur-md shadow-[0_0_40px_rgba(234,179,8,0.1)] relative overflow-hidden flex flex-col max-w-md">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-500 to-purple-500" />

                    <CardHeader>
                        <CardTitle className="text-2xl mb-2">{tiers.exclusive.title}</CardTitle>
                        <CardDescription>{tiers.exclusive.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 flex-grow">
                        <div className="flex justify-center items-baseline text-white">
                            <span className="text-5xl font-extrabold tracking-tight">
                                {currency}{tiers.exclusive.price.toLocaleString()}
                            </span>
                        </div>
                        <ul className="space-y-3 text-left">
                            {tiers.exclusive.features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <Check className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                                    <span className="text-gray-300">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Link href={`/submit?tier=exclusive`} className="w-full">
                            <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-lg py-6" size="lg">
                                Get {tiers.exclusive.title}
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>

            <p className="mt-12 text-sm text-gray-400 text-center">
                Secure payment via Paystack/Flutterwave (Coming soon). <br />
                Accepted: Debit Card, Bank Transfer, USSD.
            </p>
        </div >
    );
}
