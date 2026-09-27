"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Loader2, MailX } from "lucide-react";

function UnsubscribeInner() {
    const params = useSearchParams();
    const token = params.get("token") ?? "";
    const [state, setState] = useState<"loading" | "ready" | "done" | "invalid">("loading");
    const [email, setEmail] = useState("");
    const [already, setAlready] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!token) {
            setState("invalid");
            return;
        }
        fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`)
            .then((r) => r.json())
            .then((j) => {
                if (!j?.ok) setState("invalid");
                else {
                    setEmail(j.email);
                    setAlready(!!j.unsubscribed);
                    setState("ready");
                }
            })
            .catch(() => setState("invalid"));
    }, [token]);

    const act = async (action: "unsubscribe" | "resubscribe") => {
        setBusy(true);
        try {
            const r = await fetch("/api/unsubscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, action }),
            });
            const j = await r.json();
            if (j?.ok) {
                setAlready(action === "unsubscribe");
                setState("done");
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
            <Card className="border-white/10 bg-white/5 max-w-md w-full">
                <CardContent className="pt-10 pb-10 text-center space-y-5">
                    {state === "loading" && (
                        <>
                            <Loader2 className="w-10 h-10 animate-spin text-gray-400 mx-auto" />
                            <p className="text-gray-400">Checking your link…</p>
                        </>
                    )}
                    {state === "invalid" && (
                        <>
                            <MailX className="w-10 h-10 text-red-400 mx-auto" />
                            <h1 className="text-xl font-bold text-white">This link isn&apos;t valid</h1>
                            <p className="text-gray-400 text-sm">
                                The unsubscribe link looks broken or expired. Please use the
                                link from your most recent AfroPitch email.
                            </p>
                        </>
                    )}
                    {state === "ready" && (
                        <>
                            <MailX className="w-10 h-10 text-yellow-400 mx-auto" />
                            <h1 className="text-xl font-bold text-white">Unsubscribe?</h1>
                            <p className="text-gray-400 text-sm">
                                {already
                                    ? `${email} is already unsubscribed from AfroPitch broadcast emails.`
                                    : `Stop broadcast emails to ${email}? You'll still get important account emails (receipts, order updates).`}
                            </p>
                            {!already && (
                                <Button
                                    onClick={() => act("unsubscribe")}
                                    disabled={busy}
                                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl"
                                >
                                    {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Yes, unsubscribe me
                                </Button>
                            )}
                            {already && (
                                <Button
                                    onClick={() => act("resubscribe")}
                                    disabled={busy}
                                    variant="outline"
                                    className="w-full border-white/15 text-white hover:bg-white/10 rounded-xl"
                                >
                                    {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Resubscribe
                                </Button>
                            )}
                        </>
                    )}
                    {state === "done" && (
                        <>
                            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
                            <h1 className="text-xl font-bold text-white">
                                {already ? "You're unsubscribed" : "You're back on the list"}
                            </h1>
                            <p className="text-gray-400 text-sm">
                                {already
                                    ? "You won't receive broadcast emails from AfroPitch anymore."
                                    : "You'll receive AfroPitch broadcast emails again."}
                            </p>
                        </>
                    )}
                    <Link href="/" className="inline-block text-sm text-gray-500 hover:text-gray-300">
                        ← Back to AfroPitch
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}

export default function UnsubscribePage() {
    return (
        <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center text-gray-500">Loading…</div>}>
            <UnsubscribeInner />
        </Suspense>
    );
}
