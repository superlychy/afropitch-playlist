import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient as createAdminClient } from "@supabase/supabase-js";

let cachedSecret: string | null = null;

async function getSecret(): Promise<string> {
    if (cachedSecret) return cachedSecret;
    const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await admin.rpc("get_unsubscribe_secret");
    if (error || !data) throw new Error("Unsubscribe secret unavailable");
    cachedSecret = data as string;
    return cachedSecret;
}

function b64urlEncode(s: string): string {
    return Buffer.from(s, "utf8").toString("base64url");
}

function b64urlDecode(s: string): string {
    return Buffer.from(s, "base64url").toString("utf8");
}

/** Build a signed, tamper-proof unsubscribe token for an email address. */
export async function signUnsubscribeToken(email: string): Promise<string> {
    const secret = await getSecret();
    const normalized = email.trim().toLowerCase();
    const payload = b64urlEncode(normalized);
    const sig = createHmac("sha256", secret).update(normalized).digest("base64url");
    return `${payload}.${sig}`;
}

/** Verify a token. Returns the email address, or null when invalid. */
export async function verifyUnsubscribeToken(token: string): Promise<string | null> {
    try {
        const [payload, sig] = token.split(".");
        if (!payload || !sig) return null;
        const email = b64urlDecode(payload);
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
        const secret = await getSecret();
        const expected = createHmac("sha256", secret).update(email).digest("base64url");
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
        return email;
    } catch {
        return null;
    }
}

export function unsubscribeUrl(token: string): string {
    const base =
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
        "https://afropitchplay.best";
    return `${base}/unsubscribe?token=${encodeURIComponent(token)}`;
}
