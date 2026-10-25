"use client";

import { useState } from "react";
import Link from "next/link";

const CATEGORIES: Array<[string, string]> = [
    ["concert", "Concert"],
    ["festival", "Festival"],
    ["awards", "Awards"],
    ["industry", "Industry"],
    ["competition", "Competition"],
    ["party", "Party"],
    ["tour", "Tour"],
    ["showcase", "Showcase"],
    ["gospel", "Gospel"],
    ["comedy", "Comedy"],
    ["cultural", "Cultural"],
];

const inputCls =
    "w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/60 [&>option]:bg-[#141414]";
const labelCls = "text-sm text-gray-300 block mb-1.5";

const emptyForm = () => ({
    title: "",
    category: "concert",
    starts_at: "",
    ends_at: "",
    city: "",
    state: "",
    country: "Nigeria",
    venue: "",
    lineup: "",
    organizer: "",
    ticket_url: "",
    is_free: false,
    price: "",
    description: "",
    image_url: "",
    contact_name: "",
    contact_email: "",
    website: "",
});

export default function SubmitEventPage() {
    const [form, setForm] = useState(emptyForm);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const set = (patch: Partial<ReturnType<typeof emptyForm>>) =>
        setForm((prev) => ({ ...prev, ...patch }));

    const toIso = (local: string) => (local ? new Date(local).toISOString() : "");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!form.title.trim()) return setError("Give the event a name.");
        if (!form.starts_at || !form.ends_at) return setError("Set a start and end date and time.");
        if (new Date(form.ends_at) < new Date(form.starts_at)) return setError("The end must be after the start.");
        if (!form.city.trim()) return setError("Set a city.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) return setError("Give a valid contact email.");

        setSending(true);
        try {
            const res = await fetch("/api/events/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    starts_at: toIso(form.starts_at),
                    ends_at: toIso(form.ends_at),
                }),
            });
            const data = await res.json();
            if (!data.ok) {
                setError(data.error || "Could not save your event. Please try again.");
                return;
            }
            setDone(true);
        } catch {
            setError("Could not save your event. Please try again.");
        } finally {
            setSending(false);
        }
    };

    if (done) {
        return (
            <main className="w-full mx-auto max-w-4xl px-4 py-16 md:py-24 text-center">
                <h1 className="text-4xl font-bold tracking-tight text-white mb-4">Thanks, we got it.</h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
                    Your event is under review. It will appear on the events page once it is approved.
                </p>
                <Link href="/events" className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-yellow-300 transition-colors">
                    Back to events
                </Link>
            </main>
        );
    }

    return (
        <main className="w-full mx-auto max-w-4xl px-4 py-16 md:py-24">
            <div className="text-center space-y-4 mb-12">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    List your <span className="text-yellow-400">event</span>
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Free listings. Every submission is reviewed before it goes live.
                </p>
            </div>

            <form onSubmit={submit} className="space-y-5">
                <div>
                    <label className={labelCls}>Event name *</label>
                    <input className={inputCls} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Detty December Fest" />
                </div>

                <div>
                    <label className={labelCls}>Category *</label>
                    <select className={inputCls} value={form.category} onChange={(e) => set({ category: e.target.value })}>
                        {CATEGORIES.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                        <label className={labelCls}>Starts *</label>
                        <input type="datetime-local" className={inputCls} value={form.starts_at} onChange={(e) => set({ starts_at: e.target.value })} />
                    </div>
                    <div>
                        <label className={labelCls}>Ends *</label>
                        <input type="datetime-local" className={inputCls} value={form.ends_at} onChange={(e) => set({ ends_at: e.target.value })} />
                    </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-5">
                    <div>
                        <label className={labelCls}>City *</label>
                        <input className={inputCls} value={form.city} onChange={(e) => set({ city: e.target.value })} placeholder="Lagos" />
                    </div>
                    <div>
                        <label className={labelCls}>State</label>
                        <input className={inputCls} value={form.state} onChange={(e) => set({ state: e.target.value })} placeholder="Lagos State" />
                    </div>
                    <div>
                        <label className={labelCls}>Country</label>
                        <input className={inputCls} value={form.country} onChange={(e) => set({ country: e.target.value })} />
                    </div>
                </div>

                <div>
                    <label className={labelCls}>Venue</label>
                    <input className={inputCls} value={form.venue} onChange={(e) => set({ venue: e.target.value })} placeholder="Eko Convention Centre" />
                </div>

                <div>
                    <label className={labelCls}>Lineup / performing acts</label>
                    <input className={inputCls} value={form.lineup} onChange={(e) => set({ lineup: e.target.value })} placeholder="Separate acts with commas" />
                </div>

                <div>
                    <label className={labelCls}>Organiser</label>
                    <input className={inputCls} value={form.organizer} onChange={(e) => set({ organizer: e.target.value })} placeholder="Who is putting this on?" />
                </div>

                <div>
                    <label className={labelCls}>Ticket link</label>
                    <input className={inputCls} value={form.ticket_url} onChange={(e) => set({ ticket_url: e.target.value })} placeholder="https://..." />
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="is_free"
                        checked={form.is_free}
                        onChange={(e) => set({ is_free: e.target.checked })}
                        className="w-4 h-4 accent-yellow-400"
                    />
                    <label htmlFor="is_free" className="text-sm text-gray-300">Free entry</label>
                </div>

                {!form.is_free && (
                    <div>
                        <label className={labelCls}>Ticket price</label>
                        <input className={inputCls} value={form.price} onChange={(e) => set({ price: e.target.value })} placeholder="e.g. from ₦20,000" />
                    </div>
                )}

                <div>
                    <label className={labelCls}>About the event</label>
                    <textarea className={inputCls} rows={4} value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Anything else people should know" />
                </div>

                <div>
                    <label className={labelCls}>Poster image link</label>
                    <input className={inputCls} value={form.image_url} onChange={(e) => set({ image_url: e.target.value })} placeholder="https://... (optional, a link to your poster)" />
                    <p className="text-xs text-gray-500 mt-1.5">Leave this blank and the listing uses the standard artwork for its category.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                        <label className={labelCls}>Your name *</label>
                        <input className={inputCls} value={form.contact_name} onChange={(e) => set({ contact_name: e.target.value })} />
                    </div>
                    <div>
                        <label className={labelCls}>Your email *</label>
                        <input type="email" className={inputCls} value={form.contact_email} onChange={(e) => set({ contact_email: e.target.value })} />
                    </div>
                </div>

                <input
                    type="text"
                    name="website"
                    value={form.website}
                    onChange={(e) => set({ website: e.target.value })}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="hidden"
                />

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                    type="submit"
                    disabled={sending}
                    className="w-full sm:w-auto rounded-xl bg-yellow-400 px-6 py-3 text-sm font-bold text-black hover:bg-yellow-300 transition-colors disabled:opacity-50"
                >
                    {sending ? "Sending..." : "Submit event"}
                </button>
            </form>
        </main>
    );
}
