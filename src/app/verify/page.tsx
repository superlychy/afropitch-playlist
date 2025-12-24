"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, Search, CheckCircle, AlertCircle } from "lucide-react";

export default function VerifyPage() {
    const [isChecking, setIsChecking] = useState(false);
    const [result, setResult] = useState<"success" | "error" | null>(null);

    const handleVerify = (e: React.FormEvent) => {
        e.preventDefault();
        setIsChecking(true);
        setResult(null);

        // Mock API simulation
        setTimeout(() => {
            setIsChecking(false);
            // Randomly verify for demo purposes
            if (Math.random() > 0.3) {
                setResult("success");
            } else {
                setResult("error");
            }
        }, 2000);
    };

    return (
        <div className="container max-w-lg py-16 md:py-24">
            <div className="text-center mb-8 space-y-2">
                <h1 className="text-3xl font-bold text-white">Verify Placement</h1>
                <p className="text-gray-400">
                    Confirm your song has been added to the playlist to release payment.
                </p>
            </div>

            <Card className="border-green-500/20 bg-black/40">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-green-500" /> Secure Release
                    </CardTitle>
                    <CardDescription>
                        Enter your song link and the playlist link provided by the curator.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleVerify} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="songLink">Your Song Link</Label>
                            <Input id="songLink" placeholder="https://open.spotify.com/track/..." required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="playlistLink">Playlist Link</Label>
                            <Input id="playlistLink" placeholder="https://open.spotify.com/playlist/..." required />
                        </div>

                        <Button className="w-full bg-white text-black hover:bg-gray-200" disabled={isChecking}>
                            {isChecking ? (
                                <>Checking...</>
                            ) : (
                                <><Search className="w-4 h-4 mr-2" /> Verify Placement</>
                            )}
                        </Button>
                    </form>

                    {result === "success" && (
                        <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-green-500">Verified!</h4>
                                <p className="text-sm text-green-400">Song found in playlist. Payment has been released to the curator.</p>
                            </div>
                        </div>
                    )}

                    {result === "error" && (
                        <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-red-500">Not Found</h4>
                                <p className="text-sm text-red-400">We couldn't verify the song in this playlist yet. Please check the links or try again later.</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
