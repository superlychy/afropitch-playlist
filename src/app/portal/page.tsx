"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ShieldCheck, Search, CheckCircle, AlertCircle, Lock, User, LogOut, Mail, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function PortalPage() {
    const router = useRouter();
    const { user, login, signup, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<"artist" | "curator">("artist");
    const [isSignup, setIsSignup] = useState(false);

    // Form State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");
        setIsLoading(true);

        try {
            if (isSignup) {
                await signup(email, password, activeTab, name);
                setSuccessMessage("Account created! Please check your email to confirm specific access.");
                // Clear password for security
                setPassword("");
            } else {
                await login(email, password);
            }
        } catch (err: any) {
            console.error(err);
            // Translate common Supabase errors
            if (err.message.includes("Email not confirmed")) {
                setError("Please confirm your email address before logging in.");
            } else if (err.message.includes("Invalid login credentials")) {
                setError("Invalid email or password.");
            } else {
                setError(err.message || "An error occurred");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Manual Refresh Handler for "I've confirmed my email"
    const handleCheckConfirmation = async () => {
        setIsLoading(true);
        try {
            // refreshSession() triggers onAuthStateChange in AuthContext
            const { data, error } = await supabase.auth.refreshSession();

            // Also check session directly as backup
            const { data: sessionData } = await supabase.auth.getSession();

            if (sessionData.session) {
                // Session found! Reload to ensure fresh app state and context sync
                window.location.reload();
            } else {
                setError("Email still pending verification. Please check your inbox (and spam folder).");
            }
        } catch (e) {
            console.error(e);
            setError("Error checking status. Please try refreshing the page.");
        } finally {
            setIsLoading(false);
        }
    };

    // Redirect after login
    useEffect(() => {
        if (user) {
            const timeout = setTimeout(() => {
                if (user.role === 'admin') router.push("/dashboard/admin");
                else if (user.role === 'curator') router.push("/dashboard/curator");
                else router.push("/dashboard/artist");
            }, 100);
            return () => clearTimeout(timeout);
        }
    }, [user, router]);

    // If user is already logged in, show welcome (as fallback if redirect is slow)
    if (user) {
        return (
            <div className="container mx-auto px-4 max-w-4xl py-16 text-center space-y-6">
                <h1 className="text-4xl font-bold text-white">Welcome, {user.name}</h1>
                <p className="text-gray-400">You are logged in as a {user.role}.</p>
                <div className="flex justify-center gap-4">
                    <Button onClick={() => router.push(`/dashboard/${user.role}`)} className="bg-green-600 hover:bg-green-700">
                        Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
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

            {!successMessage && (
                <div className="flex justify-center mb-8">
                    <div className="bg-white/5 p-1 rounded-lg flex space-x-2">
                        <button
                            onClick={() => { setActiveTab("artist"); setError(""); }}
                            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "artist" ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"}`}
                        >
                            Artist Access
                        </button>
                        <button
                            onClick={() => { setActiveTab("curator"); setError(""); }}
                            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "curator" ? "bg-white text-black" : "text-gray-400 hover:text-white"}`}
                        >
                            Curator Portal
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-md mx-auto">
                <Card className={`border-white/10 bg-black/40 animate-in fade-in zoom-in-95 duration-300 ${activeTab === 'curator' ? 'shadow-[0_0_50px_rgba(255,255,255,0.1)]' : 'shadow-[0_0_50px_rgba(22,163,74,0.1)]'}`}>
                    {successMessage ? (
                        <div className="p-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto border border-green-500/30">
                                <Mail className="w-8 h-8 text-green-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white">Check Your Email</h3>
                                <p className="text-gray-300 text-sm">
                                    {successMessage}
                                </p>
                                <p className="text-xs text-gray-500">
                                    We sent a confirmation link to <strong className="text-gray-300">{email}</strong>.<br />
                                    Click the link in the email to activate your account.
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center justify-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-3 pt-2">
                                <Button
                                    onClick={handleCheckConfirmation}
                                    className="w-full bg-green-600 hover:bg-green-700 py-6 text-base"
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Verifying..." : "I've Confirmed My Email"}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => { setSuccessMessage(""); setIsSignup(false); }}
                                    className="w-full text-gray-400 hover:text-white text-sm"
                                >
                                    Back to Login
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
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
                                {error && (
                                    <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}
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
                                            autoComplete="username"
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
                                            autoComplete="current-password"
                                        />
                                    </div>
                                    <Button
                                        disabled={isLoading}
                                        variant={activeTab === 'artist' ? 'default' : 'white'}
                                        className="w-full font-bold"
                                    >
                                        {isLoading ? "Processing..." : (isSignup ? "Create Account" : "Log In")}
                                    </Button>
                                </form>
                            </CardContent>
                            <CardFooter className="justify-center border-t border-white/5 pt-6">
                                <p className="text-sm text-gray-400">
                                    {isSignup ? "Already have an account?" : "New to AfroPitch?"}{" "}
                                    <span
                                        onClick={() => { setIsSignup(!isSignup); setError(""); setSuccessMessage(""); }}
                                        className={`cursor-pointer hover:underline ${activeTab === 'artist' ? 'text-green-500' : 'text-white'}`}
                                    >
                                        {isSignup ? "Log In" : "Create Account"}
                                    </span>
                                </p>
                            </CardFooter>
                        </>
                    )}
                </Card>
            </div>
        </div>
    );
}
