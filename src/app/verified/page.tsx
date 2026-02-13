"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

function VerifiedContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 animate-in fade-in duration-500">
                <div className="bg-red-500/10 p-6 rounded-full mb-6 ring-4 ring-red-500/20">
                    <XCircle className="w-16 h-16 text-red-500" />
                </div>

                <h1 className="text-4xl font-bold tracking-tight mb-4 text-white">Verification Failed</h1>
                <p className="text-red-400 max-w-md mb-8 text-lg text-center">
                    {errorDescription?.replace(/\+/g, " ") || "We couldn't verify your email. The link may be invalid or expired."}
                </p>

                <div className="flex gap-4">
                    <Link href="/portal">
                        <Button variant="outline" size="lg" className="border-white/10 hover:bg-white/5">
                            Back to Portal
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 animate-in fade-in duration-500">
            <div className="bg-green-500/10 p-6 rounded-full mb-6 ring-4 ring-green-500/20">
                <CheckCircle className="w-16 h-16 text-green-500" />
            </div>

            <h1 className="text-4xl font-bold tracking-tight mb-4 text-white">Email Verified Successfully!</h1>
            <p className="text-gray-400 max-w-md mb-8 text-lg">
                Your account has been confirmed. You can now access your dashboard and start submitting music.
            </p>

            <div className="flex gap-4">
                <Link href="/">
                    <Button variant="outline" size="lg" className="border-white/10 hover:bg-white/5">
                        Go Home
                    </Button>
                </Link>
                <Link href="/portal">
                    <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white font-bold border-none">
                        Log In Now
                    </Button>
                </Link>
            </div>
        </div>
    );
}

export default function VerifiedPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black/90 flex items-center justify-center text-green-500">Verifying...</div>}>
            <VerifiedContent />
        </Suspense>
    );
}
