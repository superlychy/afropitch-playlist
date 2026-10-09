"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type MenuGroup = {
    name: string;
    links: { name: string; href: string; description?: string }[];
};

const menuGroups: MenuGroup[] = [
    {
        name: "Discover",
        links: [
            { name: "Playlists", href: "/playlists", description: "Curated Afrobeat playlists" },
            { name: "Featured", href: "/featured", description: "Artist of the week" },
            { name: "Events", href: "/events", description: "Concerts and festivals" },
            { name: "Mixed Songs", href: "/mixed", description: "Mixed by AfroPitch" },
        ],
    },
    {
        name: "Services",
        links: [
            { name: "Mixing", href: "/mixing", description: "Pro mixing & mastering" },
            { name: "Pricing", href: "/pricing", description: "Submission plans" },
        ],
    },
    {
        name: "Company",
        links: [
            { name: "How It Works", href: "/how-it-works", description: "Pitching, explained" },
            { name: "Trust", href: "/trust", description: "Why artists trust us" },
            { name: "Contact", href: "/contact", description: "Get in touch" },
        ],
    },
];

function DesktopDropdown({ group }: { group: MenuGroup }) {
    const [open, setOpen] = useState(false);
    return (
        <div
            className="relative"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-1 text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                aria-expanded={open}
            >
                {group.name}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {/* Always rendered in the DOM (hidden with CSS when closed) so crawlers
                and no-JS clients can discover these links; hover still toggles visibility. */}
            <div
                className={`absolute left-0 top-full pt-2 w-60 transition-opacity duration-150 ${
                    open ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
                }`}
                aria-hidden={!open}
            >
                    <div className="rounded-xl border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-md shadow-xl shadow-black/50 p-2">
                        {group.links.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                onClick={() => setOpen(false)}
                                className="block px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <div className="text-sm font-medium text-white">{link.name}</div>
                                {link.description && (
                                    <div className="text-xs text-gray-500">{link.description}</div>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>
        </div>
    );
}

function MobileGroup({ group, onNavigate }: { group: MenuGroup; onNavigate: () => void }) {
    const [open, setOpen] = useState(false);
    return (
        <div>
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center justify-between w-full text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-medium"
                aria-expanded={open}
            >
                {group.name}
                <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {/* Always in the DOM (CSS-hidden when collapsed) so crawlers can follow these links. */}
            <div className={`pl-4 pb-1 ${open ? "block" : "hidden"}`} aria-hidden={!open}>
                    {group.links.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            onClick={onNavigate}
                            className="block text-gray-400 hover:text-white px-3 py-2 rounded-md text-sm"
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>
        </div>
    );
}

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        setIsOpen(false);
    };
    const closeMenu = () => setIsOpen(false);

    return (
        <nav className="fixed w-full z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex-shrink-0">
                        <Link href="/" className="flex items-center gap-2">
                            <img src="/logo.png" alt="AfroPitch" className="w-8 h-8 rounded-md" />
                            <span className="font-bold text-xl tracking-tight text-white">
                                AfroPitch
                            </span>
                        </Link>
                    </div>
                    <div className="hidden md:block">
                        <div className="ml-10 flex items-center space-x-1">
                            <Link
                                href="/"
                                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Home
                            </Link>
                            {menuGroups.map((group) => (
                                <DesktopDropdown key={group.name} group={group} />
                            ))}
                            <Link
                                href="/submit"
                                className="ml-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-bold transition-all"
                            >
                                Submit Song
                            </Link>

                            {user ? (
                                <>
                                    <Link
                                        href={`/dashboard/${user.role}`}
                                        className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-bold transition-colors border border-white/10"
                                    >
                                        Dashboard
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="text-gray-300 hover:text-red-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <Link
                                    href="/portal"
                                    className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    Login
                                </Link>
                            )}
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

            {/* Mobile menu — always in the DOM (CSS-hidden when closed) so crawlers can follow the links. */}
            <div
                className={`md:hidden bg-background border-b border-white/10 max-h-[80vh] overflow-y-auto ${isOpen ? "block" : "hidden"}`}
                aria-hidden={!isOpen}
            >
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <Link
                            href="/"
                            className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                            onClick={closeMenu}
                        >
                            Home
                        </Link>
                        {menuGroups.map((group) => (
                            <MobileGroup key={group.name} group={group} onNavigate={closeMenu} />
                        ))}
                        <Link
                            href="/submit"
                            className="mt-4 w-full text-center bg-green-600 hover:bg-green-700 text-white block px-3 py-2 rounded-md text-base font-bold"
                            onClick={closeMenu}
                        >
                            Submit Song
                        </Link>
                        {user ? (
                            <>
                                <Link
                                    href={`/dashboard/${user.role}`}
                                    className="mt-2 w-full text-center border border-white/10 text-white block px-3 py-2 rounded-md text-base font-bold"
                                    onClick={closeMenu}
                                >
                                    Dashboard
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="mt-2 w-full text-center text-red-400 block px-3 py-2 rounded-md text-base font-bold"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <Link
                                href="/portal"
                                className="mt-2 w-full text-center text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                                onClick={closeMenu}
                            >
                                Login
                            </Link>
                        )}
                    </div>
                </div>
        </nav>
    );
}
