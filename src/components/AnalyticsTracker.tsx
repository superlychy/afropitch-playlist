"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
// @ts-ignore
import { v4 as uuidv4 } from "uuid";

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
    const { user } = useAuth();
    const sessionId = useRef<string>("");
    const clickCountRef = useRef<number>(0);
    const isSendingRef = useRef<boolean>(false);
    // Track last sent user id to re-send when user logs in
    const lastUserIdRef = useRef<string | null>(null);

    useEffect(() => {
        let sid = sessionStorage.getItem("afropitch_session_id");
        if (!sid) {
            sid = uuidv4() as string;
            sessionStorage.setItem("afropitch_session_id", sid);
        }
        sessionId.current = sid || "";

        sendEvent('init');

        const interval = setInterval(() => {
            if (!isSendingRef.current) {
                sendEvent('heartbeat', 10, clickCountRef.current);
                clickCountRef.current = 0;
            }
        }, 10000);

        const clickHandler = () => { clickCountRef.current += 1; };
        document.addEventListener('click', clickHandler);

        return () => {
            clearInterval(interval);
            document.removeEventListener('click', clickHandler);
        };
    }, []);

    // Re-fire init on page change
    useEffect(() => {
        if (!sessionId.current) return;
        sendEvent('init');
    }, [pathname, searchParams]);

    // Re-fire when user logs in so their ID gets attached to the session
    useEffect(() => {
        if (!sessionId.current) return;
        const uid = user?.id || null;
        if (uid !== lastUserIdRef.current) {
            lastUserIdRef.current = uid;
            sendEvent('init'); // update session record with user_id
        }
    }, [user?.id]);

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
                    clickCount: countPayload,
                    userId: user?.id || null  // pass user id if logged in
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
