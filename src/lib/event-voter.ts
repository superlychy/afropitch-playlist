import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase-server";

export const EVENT_VOTER_COOKIE = "ap_event_voter";

/** voter_key = logged-in user id, or an anonymous id stored in a cookie. */
export async function getEventVoterKey(): Promise<{ key: string; anonId: string | null }> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (user) return { key: `user:${user.id}`, anonId: null };

    const jar = await cookies();
    let anonId = jar.get(EVENT_VOTER_COOKIE)?.value;
    if (!anonId) anonId = randomUUID();
    return { key: `anon:${anonId}`, anonId };
}
