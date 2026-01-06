"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Headphones, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function JoinCuratorsPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Socials object
            const socials = {
                instagram: (document.getElementById('instagram') as HTMLInputElement).value,
                twitter: (document.getElementById('twitter') as HTMLInputElement).value,
                website: (document.getElementById('website') as HTMLInputElement).value,
            };

            const { error } = await supabase
                .from('curator_applications')
                .insert({
                    name: (document.getElementById('name') as HTMLInputElement).value,
                    email: (document.getElementById('email') as HTMLInputElement).value,
                    bio: (document.getElementById('bio') as HTMLTextAreaElement).value,
                    playlist_link: (document.getElementById('playlistLink') as HTMLInputElement).value,
                    social_links: socials,
                });

            if (error) throw error;
            setIsSuccess(true);
        } catch (err) {
            console.error("Application failed:", err);
            alert("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="container mx-auto px-4 max-w-lg py-24 md:py-32 flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center animate-bounce">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold text-white">Application Received!</h1>
                <p className="text-gray-400">
                    We'll review your playlists and get back to you within 24 hours. Welcome to the team.
                </p>
                <Button onClick={() => setIsSuccess(false)} variant="outline" className="mt-4">
                    Back to Home
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 max-w-2xl py-12 md:py-16">
            <div className="text-center mb-10 space-y-3">
                <h1 className="text-4xl font-bold text-white">Become a Curator</h1>
                <p className="text-xl text-gray-400">
                    Monetize your taste. Help artists get discovered.
                </p>
            </div>

            <Card className="border-green-500/20 bg-black/40 backdrop-blur-sm">
                <CardHeader>
                    <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                        <Headphones className="w-6 h-6 text-green-500" />
                    </div>
                    <CardTitle className="text-center">Curator Application</CardTitle>
                    <CardDescription className="text-center">
                        Register your profile and start accepting submissions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Curator / Brand Name</Label>
                                <Input id="name" placeholder="e.g. AfroHits Daily" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" type="email" placeholder="contact@example.com" required />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bio">Short Bio</Label>
                            <Textarea id="bio" placeholder="Describe your vibe and what you look for..." />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="playlistLink">Primary Playlist Link</Label>
                            <Input id="playlistLink" placeholder="https://open.spotify.com/playlist/..." required />
                            <p className="text-xs text-gray-500">We verify ownership before approval.</p>
                        </div>

                        {/* Socials Section */}
                        <div className="space-y-4 pt-4 border-t border-white/10">
                            <h3 className="text-lg font-semibold text-white">Social Profiles (Optional)</h3>
                            <p className="text-sm text-gray-400 -mt-3">Help artists find and verify you.</p>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="instagram">Instagram Username</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-gray-500 text-sm">@</span>
                                        <Input id="instagram" className="pl-8" placeholder="username" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="twitter">Twitter/X Username</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-gray-500 text-sm">@</span>
                                        <Input id="twitter" className="pl-8" placeholder="username" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="website">Website / Portfolio</Label>
                                <Input id="website" placeholder="https://..." />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-white text-black hover:bg-gray-200 text-lg py-6 font-bold"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Applying...</> : "Submit Application"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="mt-8 text-center text-sm text-gray-500">
                <p>Already a curator? <span className="text-green-500 underline cursor-pointer">Login here</span></p>
            </div>
        </div>
    );
}
