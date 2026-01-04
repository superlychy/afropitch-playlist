import Link from "next/link";
import { siteConfig } from "@/../config/site";

export function Footer() {
    return (
        <footer className="bg-black py-12 border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white">AfroPitch Playlist</h3>
                        <p className="text-gray-400 text-sm">
                            Helping Afro-based artists get heard. Trusted playlist reviews and
                            pitches.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">Platform</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li>
                                <Link href="/how-it-works" className="hover:text-green-500">
                                    How It Works
                                </Link>
                            </li>
                            <li>
                                <Link href="/pricing" className="hover:text-green-500">
                                    Pricing
                                </Link>
                            </li>
                            <li>
                                <Link href="/curators" className="hover:text-green-500">
                                    Browse Curators
                                </Link>
                            </li>
                            <li>
                                <Link href="/portal" className="hover:text-green-500">
                                    Verify Placement
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">Support</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li>
                                <Link href="/contact" className="hover:text-green-500">
                                    Contact Us
                                </Link>
                            </li>
                            <li>
                                <Link href="/curators/join" className="text-green-500 hover:text-green-400 font-medium">
                                    Become a Curator
                                </Link>
                            </li>
                            <li>
                                <Link href="/portal" className="hover:text-green-500">
                                    Curator Login
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li>
                                <Link href="/privacy" className="hover:text-green-500">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="hover:text-green-500">
                                    Terms of Service
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="mt-8 pt-8 border-t border-white/10 text-center text-gray-500 text-sm">
                    <p>
                        &copy; {new Date().getFullYear()} {siteConfig.name}. All rights
                        reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
