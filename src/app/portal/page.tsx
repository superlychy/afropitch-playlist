"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ShieldCheck, Search, CheckCircle, AlertCircle, Lock, User, LogOut } from "lucide-react";

export default function PortalPage() {
    const router = useRouter();
    const { user, login, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<"artist" | "curator">("artist");

    // Login State
    const [email, setEmail] = useState("");

    // Verification State
    const [isChecking, setIsChecking] = useState(false);
    const [verifyResult, setVerifyResult] = useState<"success" | "error" | null>(null);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        login(email, activeTab);
        if (activeTab === "curator") {
            router.push("/dashboard/curator");
        } else {
            router.push("/dashboard/artist");
        }
    };

    const handleVerify = (e: React.FormEvent) => {
        e.preventDefault();
        setIsChecking(true);
        setVerifyResult(null);

        // Mock API
        setTimeout(() => {
            setIsChecking(false);
            setVerifyResult(Math.random() > 0.3 ? "success" : "error");
        }, 2000);
    };

    if (user) {
        return (
            <div className="container mx-auto px-4 max-w-4xl py-16 text-center space-y-6">
                <h1 className="text-4xl font-bold text-white">Welcome, {user.name}</h1>
                <p className="text-gray-400">You are logged in as a {user.role}.</p>
                <div className="flex justify-center gap-4">
                    <Button onClick={() => router.push(`/dashboard/${user.role}`)} className="bg-green-600 hover:bg-green-700">
                        Go to Dashboard
                    </Button>
                    <Button variant="outline" onClick={logout}>
                        <LogOut className="w-4 h-4 mr-2" /> Logout
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 max-w-4xl py-16 md:py-24">
            <div className="text-center mb-12 space-y-4">
                <h1 className="text-4xl font-bold text-white">Platform Portal</h1>
                <p className="text-gray-400">Login to manage your account or verify song placements.</p>
            </div>

            <div className="flex justify-center mb-8">
                <div className="bg-white/5 p-1 rounded-lg flex space-x-2">
                    <button
                        onClick={() => setActiveTab("artist")}
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "artist" ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"}`}
                    >
                        Artist Access
                    </button>
                    <button
                        onClick={() => setActiveTab("curator")}
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "curator" ? "bg-white text-black" : "text-gray-400 hover:text-white"}`}
                    >
                        Curator Login
                    </button>
                </div>
            </div>

            <div className="max-w-md mx-auto">
                {/* ARTIST TAB - LOGIN & VERIFY */}
                {activeTab === "artist" && (
                    <div className="space-y-8">
                        {/* Quick Verification (No Login Needed) */}
                        <Card className="border-green-500/20 bg-black/40">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-green-500" /> Quick Verification
                                </CardTitle>
                                <CardDescription>Check song placement without logging in.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleVerify} className="space-y-4">
                                    <div className="space-y-2">
                                        <Input placeholder="Song Link..." required />
                                    </div>
                                    <div className="space-y-2">
                                        <Input placeholder="Playlist Link..." required />
                                    </div>
                                    <Button className="w-full bg-white/10 hover:bg-white/20" disabled={isChecking}>
                                        {isChecking ? "Checking..." : "Verify & Release Funds"}
                                    </Button>
                                    {verifyResult === "success" && (
                                        <p className="text-green-500 text-sm font-bold flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Verified!</p>
                                    )}
                                    {verifyResult === "error" && (
                                        <p className="text-red-500 text-sm font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Not Found</p>
                                    )}
                                </form>
                            </CardContent>
                        </Card>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10"></span></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-gray-400">OR LOGIN TO DASHBOARD</span></div>
                        </div>

                        {/* Login Form */}
                        <Card className="border-white/10 bg-black/40">
                            <CardHeader>
                                <CardTitle>Artist Login</CardTitle>
                                <CardDescription>Manage wallet, view history, and get bulk discounts.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input type="email" placeholder="artist@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                                    </div>
                                    <Button className="w-full bg-green-600 hover:bg-green-700 font-bold">
                                        Login / Create Account
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* CURATOR TAB - LOGIN */}
                {activeTab === "curator" && (
                    <Card className="border-white/10 bg-black/40 animate-in fade-in zoom-in-95 duration-300">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="w-5 h-5 text-white" /> Curator Access
                            </CardTitle>
                            <CardDescription>
                                Log in to manage your playlists and withdrawals.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" placeholder="curator@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input id="password" type="password" placeholder="••••••••" />
                                </div>
                                <Button className="w-full bg-white text-black hover:bg-gray-200 font-bold">
                                    Log In
                                </Button>
                            </form>
                        </CardContent>
                        <CardFooter className="justify-center border-t border-white/5 pt-6">
                            <p className="text-sm text-gray-400">
                                New here? <a href="/curators/join" className="text-green-500 hover:underline">Apply to be a curator</a>
                            </p>
                        </CardFooter>
                    </Card>
                )}
            </div>
        </div>
    );
}
