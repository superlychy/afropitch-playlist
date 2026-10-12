"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Live search box for /events. Filters as you type (debounced) by pushing
// the q param into the URL; the server does the actual filtering.
export function EventSearchBox({
    initial,
    category,
    location,
}: {
    initial: string;
    category: string | null;
    location: string | null;
}) {
    const router = useRouter();
    const [value, setValue] = useState(initial);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setValue(initial);
    }, [initial]);

    const push = (v: string) => {
        const params = new URLSearchParams();
        if (category) params.set("category", category);
        if (location) params.set("location", location);
        const trimmed = v.trim();
        if (trimmed) params.set("q", trimmed);
        const qs = params.toString();
        router.replace(`/events${qs ? `?${qs}` : ""}`);
    };

    const onChange = (v: string) => {
        setValue(v);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => push(v), 300);
    };

    const clear = () => {
        if (timer.current) clearTimeout(timer.current);
        setValue("");
        push("");
    };

    return (
        <div className="relative w-full max-w-md">
            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Search events, venues, cities…"
                aria-label="Search events"
                className="w-full rounded-full bg-white/5 border border-white/15 px-5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500/60"
            />
            {value && (
                <button
                    type="button"
                    onClick={clear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-white"
                >
                    Clear
                </button>
            )}
        </div>
    );
}
