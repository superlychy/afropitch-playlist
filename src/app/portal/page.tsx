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
    const { user, login, signup, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<"artist" | "curator">("artist");
    const [isSignup, setIsSignup] = useState(false);

    // Form State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSignup) {
            await signup(email, password, activeTab, name);
        } else {
            await login(email, password);
        }
    };

    // Redirect after login
    if (user) {
        if (user.role === 'curator') router.push("/dashboard/curator");
        else router.push("/dashboard/artist");
    }

    /* 
    Optional: Just for smoother UX, we won't auto-redirect inside the render if we want to show a success message first, 
    but the AuthContext updates `user` state which triggers the redirect above. 
    However, purely relying on the render redirect might cause flicker. 
    Ideally, we'd handle navigation inside handleSubmit after success. 
    But AuthContext login is void, so we rely on user state change.
    */

    // If user is already logged in, show welcome (or redirect logic above takes over)
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
                <p className="text-gray-400">
                    {isSignup ? "Create an account to get started." : "Login to manage your account."}
                </p>
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
                        Curator Portal
                    </button>
                </div>
            </div>

            <div className="max-w-md mx-auto">
                <Card className={`border-white/10 bg-black/40 animate-in fade-in zoom-in-95 duration-300 ${activeTab === 'curator' ? 'shadow-[0_0_50px_rgba(255,255,255,0.1)]' : 'shadow-[0_0_50px_rgba(22,163,74,0.1)]'}`}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {activeTab === 'artist' ? <User className="w-5 h-5 text-green-500" /> : <Lock className="w-5 h-5 text-white" />}
                            {isSignup ? `Create ${activeTab === 'artist' ? 'Artist' : 'Curator'} Account` : `${activeTab === 'artist' ? 'Artist' : 'Curator'} Login`}
                        </CardTitle>
                        <CardDescription>
                            {activeTab === 'artist'
                                ? "Manage releases, wallet & analytics."
                                : "Manage playlists, submissions & earnings."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {isSignup && (
                                <div className="space-y-2 animate-in slide-in-from-top-2">
                                    <Label>Full Name / Stage Name</Label>
                                    <Input
                                        placeholder={activeTab === 'artist' ? "e.g. Burna Boy" : "e.g. Lagos Vibes"}
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        required
                                    />
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Password</Label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <Button className={`w-full font-bold ${activeTab === 'artist' ? 'bg-green-600 hover:bg-green-700' : 'bg-white text-black hover:bg-gray-200'}`}>
                                {isSignup ? "Create Account" : "Log In"}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="justify-center border-t border-white/5 pt-6">
                        <p className="text-sm text-gray-400">
                            {isSignup ? "Already have an account?" : "New to AfroPitch?"}{" "}
                            <span
                                onClick={() => setIsSignup(!isSignup)}
                                className={`cursor-pointer hover:underline ${activeTab === 'artist' ? 'text-green-500' : 'text-white'}`}
                            >
                                {isSignup ? "Log In" : "Create Account"}
                            </span>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
