"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
// @ts-ignore
import { v4 as uuidv4 } from "uuid";

// Wrapper to satisfy Suspense requirement for useSearchParams
export function AnalyticsTracker() {
    return (
        <Suspense fallback={null}>
            <AnalyticsLogic />
        </Suspense>
    );
}

function AnalyticsLogic() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const sessionId = useRef<string>("");
    // Store clicks locally to batch them
    const clickCountRef = useRef<number>(0);
    const isSendingRef = useRef<boolean>(false); // Semaphore to prevent overlapping requests

    useEffect(() => {
        let sid = sessionStorage.getItem("afropitch_session_id");
        if (!sid) {
            sid = uuidv4() as string;
            sessionStorage.setItem("afropitch_session_id", sid);
        }
        sessionId.current = sid || "";

        sendEvent('init');

        // Heartbeat every 10s (Reduced frequency from 5s) - INCLUDES BATCHED CLICKS
        const interval = setInterval(() => {
            if (!isSendingRef.current) {
                sendEvent('heartbeat', 10, clickCountRef.current);
                clickCountRef.current = 0; // Reset after sending
            } else {
                // If busy, skip this heartbeat but keep accumulating clicks
                // Optionally accumulate duration? For now just skip to prevent congestion.
            }
        }, 10000);

        // ... clickHandler ...

        const clickHandler = () => {
            clickCountRef.current += 1;
        };

        document.addEventListener('click', clickHandler);

        return () => {
            clearInterval(interval);
            document.removeEventListener('click', clickHandler);
        };
    }, []);

    useEffect(() => {
        if (!sessionId.current) return;
        sendEvent('init');
    }, [pathname, searchParams]);

    const sendEvent = async (type: 'init' | 'heartbeat' | 'click', durationPayload: number = 0, countPayload: number = 0) => {
        if (!sessionId.current) return;
        if (isSendingRef.current) return;

        isSendingRef.current = true;
        try {
            await fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    sessionId: sessionId.current,
                    href: window.location.href,
                    referrer: document.referrer,
                    userAgent: navigator.userAgent,
                    duration: durationPayload,
                    clickCount: countPayload
                })
            });
        } catch (e) {
            // silent fail
        } finally {
            isSendingRef.current = false;
        }
    };

    return null;
}
