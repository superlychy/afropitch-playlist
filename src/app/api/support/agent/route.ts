import { NextRequest, NextResponse } from "next/server";
import { SUPPORT_SYSTEM_PROMPT } from "@/lib/support-knowledge";

// AfroPitch Support agent endpoint.
//
// The widget posts the recent conversation plus a minimal visitor context
// (kind / role / identified, never names or emails), and this route asks
// Google Gemini to answer from the approved knowledge base in
// src/lib/support-knowledge.ts. The model answers with a JSON object:
// { reply, escalate, summary }. Escalations are turned into real support
// tickets by the widget, not here, because only the widget knows whether
// the visitor is identified (anonymous guests are never forwarded to the
// team). The summary is the agent's handoff brief for the human team.
//
// The API key is read at request time only, so builds never require it.
// If no key is configured, the route returns 503 and the widget falls back
// to the manual ticket path.

// Soft per-IP rate limit. This map lives in one serverless instance's memory,
// so it is a speed bump against abuse, not a hard global cap.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 30;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
    const now = Date.now();
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_PER_WINDOW) {
        hits.set(ip, recent);
        return true;
    }
    recent.push(now);
    hits.set(ip, recent);
    return false;
}

type AgentMessage = { role: "user" | "assistant"; text: string };
type Visitor = { kind?: string; role?: string; identified?: boolean };

// One short line of context for the model. Deliberately carries no personal
// data: no names, no emails, no account details.
function visitorContextLine(visitor: Visitor | undefined): string {
    if (!visitor) return "Visitor: anonymous guest";
    if (visitor.kind === "user") {
        if (visitor.role === "curator") return "Visitor: logged-in curator";
        if (visitor.role === "artist") return "Visitor: logged-in artist";
        return "Visitor: logged-in user";
    }
    if (visitor.identified) {
        return visitor.role ? `Visitor: guest, ${visitor.role}` : "Visitor: guest";
    }
    return visitor.role ? `Visitor: anonymous guest, ${visitor.role}` : "Visitor: anonymous guest";
}

async function callGemini(
    apiKey: string,
    model: string,
    systemText: string,
    contents: { role: string; parts: { text: string }[] }[]
) {
    return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemText }] },
            contents,
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.4,
                maxOutputTokens: 800,
            },
        }),
    });
}

function extractReply(data: unknown): { reply: string; escalate: boolean; summary: string } {
    const root = data as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
    } | null;
    const raw =
        root?.candidates?.[0]?.content?.parts?.map((p) => p?.text ?? "").join("") ?? "";
    const text = raw.trim();
    if (!text) return { reply: "", escalate: false, summary: "" };
    try {
        const parsed = JSON.parse(text) as { reply?: unknown; escalate?: unknown; summary?: unknown };
        if (parsed && typeof parsed.reply === "string") {
            const summary = typeof parsed.summary === "string" ? parsed.summary.trim().slice(0, 1500) : "";
            return { reply: parsed.reply.trim(), escalate: parsed.escalate === true, summary };
        }
    } catch {
        // Model ignored the JSON contract: fall through and use the raw text.
    }
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    return { reply: cleaned, escalate: false, summary: "" };
}

export async function POST(req: NextRequest) {
    const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim() || "unknown";
    if (rateLimited(ip)) {
        return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ ok: false, error: "agent_unavailable" }, { status: 503 });
    }

    let body: { messages?: unknown; visitor?: Visitor };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }

    if (!Array.isArray(body?.messages) || body.messages.length === 0) {
        return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }

    // Keep only the last 12 turns, cap each message, cap the total payload.
    let total = 0;
    const messages: AgentMessage[] = [];
    for (const m of body.messages.slice(-12) as { role?: unknown; text?: unknown }[]) {
        const role = m?.role === "assistant" ? "assistant" : m?.role === "user" ? "user" : null;
        if (!role) continue;
        const text = String(m?.text ?? "").slice(0, 1000);
        if (!text.trim()) continue;
        total += text.length;
        messages.push({ role, text });
    }
    if (messages.length === 0 || total > 13000) {
        return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }

    const systemText = `${SUPPORT_SYSTEM_PROMPT}\n\n${visitorContextLine(body.visitor)}`;
    const contents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }],
    }));

    try {
        let res = await callGemini(apiKey, "gemini-2.5-flash", systemText, contents);
        if (res.status === 429) {
            // Free-tier cap on the main model: one retry on the lite model.
            res = await callGemini(apiKey, "gemini-2.5-flash-lite", systemText, contents);
        }
        if (!res.ok) {
            return NextResponse.json({ ok: false, error: "agent_unavailable" }, { status: 502 });
        }
        const data: unknown = await res.json().catch(() => null);
        const { reply, escalate, summary } = extractReply(data);
        if (!reply) {
            return NextResponse.json({ ok: false, error: "agent_unavailable" }, { status: 502 });
        }
        return NextResponse.json({ ok: true, reply, escalate, summary });
    } catch {
        return NextResponse.json({ ok: false, error: "agent_unavailable" }, { status: 502 });
    }
}
