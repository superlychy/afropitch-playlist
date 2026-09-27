"use client";

import { useEffect } from "react";

// Reports user-side JS errors to /api/log-error so the platform owner
// can be alerted and fix them. Throttled: one report per unique error
// per page load, max 5 reports per session.
const seen = new Set<string>();
let sent = 0;

async function report(kind: string, message: string, stack?: string) {
    try {
        if (sent >= 5) return;
        const key = kind + "|" + message;
        if (!message || seen.has(key)) return;
        seen.add(key);
        sent += 1;
        await fetch("/api/log-error", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                kind,
                message: message.slice(0, 500),
                stack: (stack || "").slice(0, 2000),
                url:
                    typeof window !== "undefined"
                        ? window.location.href.slice(0, 500)
                        : "",
                userAgent:
                    typeof navigator !== "undefined"
                        ? navigator.userAgent.slice(0, 300)
                        : "",
            }),
        });
    } catch {
        // Reporting must never break the page.
    }
}

export function ErrorReporter() {
    useEffect(() => {
        const onError = (e: ErrorEvent) => {
            report("error", e.message, (e.error as any)?.stack);
        };
        const onRejection = (e: PromiseRejectionEvent) => {
            const r: any = e.reason;
            report(
                "unhandledrejection",
                r?.message || String(r).slice(0, 500),
                r?.stack
            );
        };
        window.addEventListener("error", onError);
        window.addEventListener("unhandledrejection", onRejection);
        return () => {
            window.removeEventListener("error", onError);
            window.removeEventListener("unhandledrejection", onRejection);
        };
    }, []);
    return null;
}
