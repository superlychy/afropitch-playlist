"use client";

import { useRouter } from "next/navigation";

export interface LocationTree {
    [country: string]: { [state: string]: string[] };
}

export interface FilterSelection {
    category: string | null;
    country: string | null;
    state: string | null;
    city: string | null;
    q: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
    concert: "Concert",
    festival: "Festival",
    awards: "Awards",
    industry: "Industry",
    competition: "Competition",
    party: "Party",
    tour: "Tour",
    showcase: "Showcase",
};

const selectCls =
    "rounded-full bg-white/5 border border-white/15 px-4 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/60 [&>option]:bg-[#141414]";

// Cascading Category + Country → State → City dropdowns for /events.
// The server does the actual filtering; this just drives the URL params.
export function EventFilters({
    tree,
    categories,
    current,
}: {
    tree: LocationTree;
    categories: string[];
    current: FilterSelection;
}) {
    const router = useRouter();

    const push = (updates: Partial<FilterSelection>) => {
        const next = { ...current, ...updates };
        const params = new URLSearchParams();
        if (next.category) params.set("category", next.category);
        if (next.country) params.set("country", next.country);
        if (next.state) params.set("state", next.state);
        if (next.city) params.set("city", next.city);
        if (next.q) params.set("q", next.q);
        const qs = params.toString();
        router.replace(`/events${qs ? `?${qs}` : ""}`);
    };

    const countries = Object.keys(tree).sort();
    const states = current.country ? Object.keys(tree[current.country] ?? {}).sort() : [];
    const cities =
        current.country && current.state
            ? [...(tree[current.country]?.[current.state] ?? [])].sort()
            : [];

    const hasFilter = current.category || current.country || current.q;

    return (
        <div className="flex flex-wrap justify-center gap-2 mb-4">
            <select
                value={current.category ?? ""}
                onChange={(e) => push({ category: e.target.value || null })}
                aria-label="Filter by category"
                className={selectCls}
            >
                <option value="">All categories</option>
                {categories.map((c) => (
                    <option key={c} value={c}>
                        {CATEGORY_LABELS[c] ?? c}
                    </option>
                ))}
            </select>

            <select
                value={current.country ?? ""}
                onChange={(e) =>
                    push({ country: e.target.value || null, state: null, city: null })
                }
                aria-label="Filter by country"
                className={selectCls}
            >
                <option value="">All countries</option>
                {countries.map((c) => (
                    <option key={c} value={c}>
                        {c}
                    </option>
                ))}
            </select>

            {current.country && states.length > 0 && (
                <select
                    value={current.state ?? ""}
                    onChange={(e) => push({ state: e.target.value || null, city: null })}
                    aria-label="Filter by state or province"
                    className={selectCls}
                >
                    <option value="">All states</option>
                    {states.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
            )}

            {current.country && current.state && cities.length > 0 && (
                <select
                    value={current.city ?? ""}
                    onChange={(e) => push({ city: e.target.value || null })}
                    aria-label="Filter by city"
                    className={selectCls}
                >
                    <option value="">All cities</option>
                    {cities.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
            )}

            {hasFilter && (
                <button
                    type="button"
                    onClick={() => push({ category: null, country: null, state: null, city: null, q: null })}
                    className="rounded-full px-4 py-2 text-sm text-gray-500 hover:text-white"
                >
                    Clear all
                </button>
            )}
        </div>
    );
}
