"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
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

    useEffect(() => {
        let sid = sessionStorage.getItem("afropitch_session_id");
        if (!sid) {
            sid = uuidv4();
            sessionStorage.setItem("afropitch_session_id", sid);
        }
        sessionId.current = sid || "";

        sendEvent('init');

        const interval = setInterval(() => sendEvent('heartbeat'), 30000); // 30s
        const clickHandler = () => sendEvent('click');
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

    const sendEvent = async (type: 'init' | 'heartbeat' | 'click') => {
        if (!sessionId.current) return;

        try {
            await fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    sessionId: sessionId.current,
                    href: window.location.href,
                    referrer: document.referrer,
                    userAgent: navigator.userAgent
                })
            });
        } catch (e) {
            // silent fail
        }
    };

    return null;
}
