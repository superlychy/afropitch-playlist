"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Music } from "lucide-react";

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    const navLinks = [
        { name: "Home", href: "/" },
        { name: "How It Works", href: "/how-it-works" },
        { name: "Playlists", href: "/playlists" },
        { name: "Pricing", href: "/pricing" },
        { name: "Trust", href: "/trust" },
        { name: "Contact", href: "/contact" },
    ];

    return (
        <nav className="fixed w-full z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex-shrink-0">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-orange-500 flex items-center justify-center">
                                <Music className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-white">
                                AfroPitch
                            </span>
                        </Link>
                    </div>
                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-4">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <Link
                                href="/submit"
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-bold transition-all"
                            >
                                Submit Song
                            </Link>
                        </div>
                    </div>
                    <div className="-mr-2 flex md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isOpen ? (
                                <X className="block h-6 w-6" aria-hidden="true" />
                            ) : (
                                <Menu className="block h-6 w-6" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isOpen && (
                <div className="md:hidden bg-background border-b border-white/10">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                                onClick={() => setIsOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}
                        <Link
                            href="/submit"
                            className="mt-4 w-full text-center bg-green-600 hover:bg-green-700 text-white block px-3 py-2 rounded-md text-base font-bold"
                            onClick={() => setIsOpen(false)}
                        >
                            Submit Song
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
