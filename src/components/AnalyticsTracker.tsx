"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

export function AnalyticsTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const sessionId = useRef<string>("");

    // Initialize Session ID on mount (persist across page navs, but not reload if we want strictly session)
    // Actually, storing in sessionStorage effectively sessions it per tab.
    useEffect(() => {
        let sid = sessionStorage.getItem("afropitch_session_id");
        if (!sid) {
            sid = uuidv4();
            sessionStorage.setItem("afropitch_session_id", sid);
        }
        sessionId.current = sid || "";

        // Send 'init' (or page view)
        sendEvent('init');

        // Start Heartbeat
        const interval = setInterval(() => sendEvent('heartbeat'), 30000); // 30s

        // Click Listener
        const clickHandler = () => sendEvent('click');
        document.addEventListener('click', clickHandler);

        return () => {
            clearInterval(interval);
            document.removeEventListener('click', clickHandler);
        };
    }, []);

    // Track Page Views on navigation
    useEffect(() => {
        if (!sessionId.current) return;
        // Ideally 'init' handles the page view count increment logic on server
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

    return null; // Invisible component
}
