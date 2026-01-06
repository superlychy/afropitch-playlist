"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function VerifiedPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
            <div className="bg-green-500/10 p-6 rounded-full mb-6 ring-4 ring-green-500/20">
                <CheckCircle className="w-16 h-16 text-green-500" />
            </div>

            <h1 className="text-4xl font-bold tracking-tight mb-4">Email Verified Successfully!</h1>
            <p className="text-gray-400 max-w-md mb-8 text-lg">
                Your account has been confirmed. You can now access your dashboard and start submitting music.
            </p>

            <div className="flex gap-4">
                <Link href="/">
                    <Button variant="outline" size="lg">
                        Go Home
                    </Button>
                </Link>
                {/* Assuming the main login trigger is on the home page or via a modal, 
                    since I don't see a /login route. If there is one, we link to it. 
                    For now, redirecting to Home where user can click Login. */}
                <Link href="/portal">
                    <Button size="lg" className="bg-green-500 hover:bg-green-600 text-black font-bold">
                        Log In Now
                    </Button>
                </Link>
            </div>
        </div>
    );
}
