"use client";

import { useEffect, useState } from "react";

/**
 * Client-side pagination hook. Call unconditionally at the top of a component,
 * passing the current (already filtered) list length as totalItems.
 * The page clamps itself when the list shrinks (filter change, data refresh).
 */
export function usePagination(totalItems: number, perPage: number = 50) {
    const [page, setPageState] = useState(1);
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

    // Clamp the current page when the list shrinks so we never land on an empty page.
    useEffect(() => {
        setPageState((p) =>
            Math.min(Math.max(1, p), Math.max(1, Math.ceil(totalItems / perPage)))
        );
    }, [totalItems, perPage]);

    // The state may lag one render behind totalItems; derive a safe page for slicing.
    const safePage = Math.min(Math.max(1, page), totalPages);

    const setPage = (p: number) => setPageState(Math.max(1, Math.min(p, totalPages)));
    const reset = () => setPageState(1);

    const start = totalItems === 0 ? 0 : (safePage - 1) * perPage + 1;
    const end = Math.min(safePage * perPage, totalItems);

    const paginate = <T,>(list: T[]): T[] =>
        list.slice((safePage - 1) * perPage, safePage * perPage);

    return { page: safePage, setPage, reset, start, end, totalPages, paginate, perPage };
}

export type Pagination = ReturnType<typeof usePagination>;

interface PaginationControlsProps {
    page: number;
    totalPages: number;
    start: number;
    end: number;
    total: number;
    onPageChange: (page: number) => void;
}

/** Prev/Next + "Page X of Y" + "Showing A–B of C". Renders below a list. */
export function PaginationControls({ page, totalPages, start, end, total, onPageChange }: PaginationControlsProps) {
    if (totalPages <= 1) return null;
    const btn =
        "px-3 py-1.5 rounded-md text-xs font-bold border transition-all bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed";
    return (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
            <p className="text-xs text-gray-500">
                Showing {start}–{end} of {total}
            </p>
            <div className="flex items-center gap-2">
                <button className={btn} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
                    Prev
                </button>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                    Page {page} of {totalPages}
                </span>
                <button className={btn} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
                    Next
                </button>
            </div>
        </div>
    );
}

interface FilterOption {
    value: string;
    label: string;
}

interface FilterButtonsProps {
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
    /** Pagination reset — called after onChange so every filter change returns to page 1. */
    reset?: () => void;
}

/** Small pill filter buttons matching the existing admin dark-theme filter style. */
export function FilterButtons({ options, value, onChange, reset }: FilterButtonsProps) {
    return (
        <div className="flex gap-1 flex-wrap">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => {
                        onChange(opt.value);
                        reset?.();
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all ${
                        value === opt.value
                            ? "bg-white text-black"
                            : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}
