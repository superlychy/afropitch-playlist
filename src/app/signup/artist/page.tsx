"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { User, Mail, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ArtistSignupPage() {
    const router = useRouter();
    const { signup, isLoading } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await signup(email, password, "artist", name);
        // AuthContext handles alert. If success, user needs to login or is auto-logged in? 
        // Supabase auto-login after signup is default unless email confirmation is on. 
        // But my AuthContext signup says "Account created! You can now log in." 
        // Logic suggests redirect to login (portal).
        router.push("/portal");
        setIsSubmitting(false);
    };

    return (
        <div className="container mx-auto px-4 max-w-md py-16 md:py-24">
            <div className="text-center mb-8">
                <Link href="/" className="inline-block mb-6">
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-green-600">
                        AfroPitch
                    </span>
                </Link>
                <h1 className="text-3xl font-bold text-white mb-2">Join as an Artist</h1>
                <p className="text-gray-400">Create your account to start pitching your music.</p>
            </div>

            <Card className="border-white/10 bg-black/40 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>Create Account</CardTitle>
                    <CardDescription>Sign up with email and password.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Artist / Stage Name</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                <Input
                                    id="name"
                                    placeholder="e.g. Burna Boy"
                                    className="pl-9 bg-white/5 border-white/10"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="artist@example.com"
                                    className="pl-9 bg-white/5 border-white/10"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                className="bg-white/5 border-white/10"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 font-bold h-11" disabled={isSubmitting || isLoading}>
                            {isSubmitting || isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                                </>
                            ) : (
                                <>
                                    Create Account <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center border-t border-white/5 pt-6">
                    <p className="text-sm text-gray-400">
                        Already have an account? <Link href="/portal" className="text-green-400 hover:underline font-medium">Log in</Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
