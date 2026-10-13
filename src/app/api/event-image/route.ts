import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// Category image generator: returns a 1200x630 SVG in the approved
// category design. Text is kept in the centre-safe zone so it survives
// both the square card crop and the wide detail banner crop.
// AfroPitch branding is ONLY added when branded=1 (confirmed partnership).

const W = 1200;
const H = 630;

function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapTitle(title: string, maxChars: number): string[] {
    const words = title.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
        if ((cur + " " + w).trim().length > maxChars && cur) {
            lines.push(cur.trim());
            cur = w;
        } else {
            cur = (cur + " " + w).trim();
        }
    }
    if (cur) lines.push(cur.trim());
    return lines.slice(0, 3);
}

type Design = {
    bg: string;
    badgeFill: string;
    badgeText: string;
    titleFill: string;
    titleFont: string;
    titleTransform: string;
    titleSpacing: string;
    titleSkew: string;
    metaFont: string;
    metaFill: string;
    shadow?: string;
    underline?: string;
};

const DESIGNS: Record<string, Design> = {
    concert: {
        bg: "bg-concert",
        badgeFill: "#22c55e", badgeText: "#04110a",
        titleFill: "#ffffff", titleFont: "'Arial Black',Arial,sans-serif",
        titleTransform: "uppercase", titleSpacing: "-1px", titleSkew: "skewX(-3)",
        metaFont: "Arial,Helvetica,sans-serif", metaFill: "#ffffff",
    },
    festival: {
        bg: "bg-festival",
        badgeFill: "rgba(0,0,0,0.35)", badgeText: "#ffffff",
        titleFill: "#ffffff", titleFont: "Arial,Helvetica,sans-serif",
        titleTransform: "uppercase", titleSpacing: "1px", titleSkew: "rotate(-1)",
        metaFont: "Arial,Helvetica,sans-serif", metaFill: "#ffffff",
        shadow: "0.35cqw",
    },
    party: {
        bg: "bg-party",
        badgeFill: "#e11d74", badgeText: "#ffffff",
        titleFill: "#ffffff", titleFont: "'Trebuchet MS',Verdana,sans-serif",
        titleTransform: "none", titleSpacing: "1px", titleSkew: "",
        metaFont: "'Trebuchet MS',Verdana,sans-serif", metaFill: "#ffffff",
    },
    tour: {
        bg: "bg-tour",
        badgeFill: "#22d3ee", badgeText: "#04121a",
        titleFill: "#ffffff", titleFont: "'Arial Narrow','Helvetica Neue Condensed',Arial,sans-serif",
        titleTransform: "uppercase", titleSpacing: "6px", titleSkew: "",
        metaFont: "Arial,Helvetica,sans-serif", metaFill: "#ffffff",
    },
    showcase: {
        bg: "bg-showcase",
        badgeFill: "#22c55e", badgeText: "#04110a",
        titleFill: "#ffffff", titleFont: "Arial,Helvetica,sans-serif",
        titleTransform: "uppercase", titleSpacing: "8px", titleSkew: "",
        metaFont: "Arial,Helvetica,sans-serif", metaFill: "#ffffff",
    },
    industry: {
        bg: "bg-industry",
        badgeFill: "#38bdf8", badgeText: "#04121a",
        titleFill: "#ffffff", titleFont: "Arial,Helvetica,sans-serif",
        titleTransform: "uppercase", titleSpacing: "7px", titleSkew: "",
        metaFont: "Arial,Helvetica,sans-serif", metaFill: "#ffffff",
    },
    awards: {
        bg: "bg-awards",
        badgeFill: "#facc15", badgeText: "#1a1405",
        titleFill: "#fde68a", titleFont: "Georgia,'Times New Roman',serif",
        titleTransform: "none", titleSpacing: "1px", titleSkew: "",
        metaFont: "Georgia,'Times New Roman',serif", metaFill: "#ffffff",
    },
    competition: {
        bg: "bg-competition",
        badgeFill: "#ffffff", badgeText: "#7f1d1d",
        titleFill: "#ffffff", titleFont: "'Courier New',monospace",
        titleTransform: "uppercase", titleSpacing: "1px", titleSkew: "skewX(-5)",
        metaFont: "'Courier New',monospace", metaFill: "#ffffff",
    },
    gospel: {
        bg: "bg-gospel",
        badgeFill: "#92400e", badgeText: "#fef3c7",
        titleFill: "#451a03", titleFont: "Georgia,'Times New Roman',serif",
        titleTransform: "none", titleSpacing: "1px", titleSkew: "",
        metaFont: "Georgia,'Times New Roman',serif", metaFill: "#451a03",
    },
    comedy: {
        bg: "bg-comedy",
        badgeFill: "#111111", badgeText: "#facc15",
        titleFill: "#1a1005", titleFont: "'Trebuchet MS',Verdana,sans-serif",
        titleTransform: "none", titleSpacing: "1px", titleSkew: "rotate(-1)",
        metaFont: "'Trebuchet MS',Verdana,sans-serif", metaFill: "#1a1005",
    },
    cultural: {
        bg: "bg-cultural",
        badgeFill: "#f97316", badgeText: "#1a0f05",
        titleFill: "#ffffff", titleFont: "Georgia,'Times New Roman',serif",
        titleTransform: "uppercase", titleSpacing: "3px", titleSkew: "",
        metaFont: "Georgia,'Times New Roman',serif", metaFill: "#ffffff",
        underline: "#f97316",
    },
};

function background(slug: string): string {
    switch (slug) {
        case "concert": {
            const bars = [35, 60, 45, 80, 55, 95, 40, 70, 50, 88, 62, 42, 75, 58, 90, 48, 68, 38, 82, 52, 72, 44, 66, 58, 78, 40, 60, 50, 85, 46, 70, 54, 62, 38, 74, 58, 88, 44, 66, 52, 70, 40];
            const bw = W / bars.length;
            return `<defs>
                <radialGradient id="g1" cx="15%" cy="0%" r="75%"><stop offset="0%" stop-color="#22c55e" stop-opacity="0.55"/><stop offset="60%" stop-color="#22c55e" stop-opacity="0"/></radialGradient>
                <radialGradient id="g2" cx="90%" cy="100%" r="67%"><stop offset="0%" stop-color="#f97316" stop-opacity="0.5"/><stop offset="60%" stop-color="#f97316" stop-opacity="0"/></radialGradient>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0a0a12"/><stop offset="55%" stop-color="#141428"/><stop offset="100%" stop-color="#1a0f1e"/></linearGradient>
                <linearGradient id="bar" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#22c55e"/><stop offset="100%" stop-color="#f97316"/></linearGradient>
            </defs>
            <rect width="${W}" height="${H}" fill="url(#bg)"/>
            <rect width="${W}" height="${H}" fill="url(#g1)"/><rect width="${W}" height="${H}" fill="url(#g2)"/>
            <g opacity="0.35">${bars.map((h, i) => `<rect x="${(i * bw + 2).toFixed(0)}" y="${(H - (h / 100) * 170).toFixed(0)}" width="${(bw - 4).toFixed(0)}" height="${((h / 100) * 170).toFixed(0)}" fill="url(#bar)" rx="6"/>`).join("")}</g>`;
        }
        case "festival": {
            return `<defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f97316"/><stop offset="45%" stop-color="#ec4899"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient>
                <pattern id="dots" width="64" height="64" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="5" fill="#ffffff" opacity="0.55"/></pattern>
            </defs>
            <rect width="${W}" height="${H}" fill="url(#bg)"/><rect width="${W}" height="${H}" fill="url(#dots)" opacity="0.5"/>`;
        }
        case "party": {
            return `<defs>
                <radialGradient id="glow" cx="50%" cy="0%" r="58%"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.28"/><stop offset="55%" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#2b0a3d"/><stop offset="45%" stop-color="#7c1065"/><stop offset="100%" stop-color="#e11d74"/></linearGradient>
            </defs>
            <rect width="${W}" height="${H}" fill="url(#bg)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>
            <circle cx="1060" cy="-40" r="260" fill="#ffffff" opacity="0.12"/><circle cx="1060" cy="-40" r="160" fill="#ffffff" opacity="0.12"/>`;
        }
        case "tour": {
            return `<defs>
                <radialGradient id="g1" cx="100%" cy="0%" r="67%"><stop offset="0%" stop-color="#22d3ee" stop-opacity="0.35"/><stop offset="60%" stop-color="#22d3ee" stop-opacity="0"/></radialGradient>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#041e2e"/><stop offset="55%" stop-color="#0a3a52"/><stop offset="100%" stop-color="#0c4a5e"/></linearGradient>
            </defs>
            <rect width="${W}" height="${H}" fill="url(#bg)"/><rect width="${W}" height="${H}" fill="url(#g1)"/>
            <ellipse cx="600" cy="130" rx="520" ry="110" fill="none" stroke="#22d3ee" stroke-opacity="0.55" stroke-width="3" stroke-dasharray="14 10" transform="rotate(-4 600 130)"/>
            <g><path d="M180 300 l17 -30 a17 17 0 1 1 34 0 l-17 30 z" fill="#22d3ee"/><circle cx="197" cy="278" r="30" fill="#22d3ee" opacity="0.25"/></g>
            <g><path d="M990 250 l17 -30 a17 17 0 1 1 34 0 l-17 30 z" fill="#f97316"/><circle cx="1007" cy="228" r="30" fill="#f97316" opacity="0.25"/></g>`;
        }
        case "showcase": {
            return `<defs>
                <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#050505"/><stop offset="100%" stop-color="#101828"/></linearGradient>
                <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#22c55e" stop-opacity="0.22"/><stop offset="100%" stop-color="#22c55e" stop-opacity="0"/></linearGradient>
            </defs>
            <rect width="${W}" height="${H}" fill="url(#bg)"/>
            <polygon points="460,0 740,0 980,630 220,630" fill="url(#cone)"/>`;
        }
        case "industry": {
            return `<defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0b1220"/><stop offset="60%" stop-color="#111c33"/><stop offset="100%" stop-color="#16223f"/></linearGradient>
                <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0H0V60" fill="none" stroke="#94a3b8" stroke-opacity="0.18" stroke-width="1"/></pattern>
            </defs>
            <rect width="${W}" height="${H}" fill="url(#bg)"/><rect width="${W}" height="${H}" fill="url(#grid)" opacity="0.35"/>`;
        }
        case "awards": {
            const stars: Array<[number, number, number]> = [[120, 90, 10], [300, 60, 7], [520, 110, 12], [760, 70, 8], [980, 120, 11], [150, 420, 8], [1080, 380, 9], [640, 60, 6], [880, 200, 7], [240, 220, 6]];
            return `<defs>
                <radialGradient id="g1" cx="50%" cy="-10%" r="58%"><stop offset="0%" stop-color="#facc15" stop-opacity="0.35"/><stop offset="60%" stop-color="#facc15" stop-opacity="0"/></radialGradient>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0a0a0a"/><stop offset="55%" stop-color="#1a1405"/><stop offset="100%" stop-color="#2a2108"/></linearGradient>
            </defs>
            <rect width="${W}" height="${H}" fill="url(#bg)"/><rect width="${W}" height="${H}" fill="url(#g1)"/>
            <g fill="#facc15" opacity="0.8">${stars.map(([x, y, s]) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" transform="rotate(45 ${x + s / 2} ${y + s / 2})"/>`).join("")}</g>`;
        }
        case "competition": {
            return `<defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1a0505"/><stop offset="55%" stop-color="#7f1d1d"/><stop offset="100%" stop-color="#dc2626"/></linearGradient>
            </defs>
            <rect width="${W}" height="${H}" fill="url(#bg)"/>
            <text x="1120" y="190" font-family="Arial,Helvetica,sans-serif" font-size="120" font-weight="900" fill="#ffffff" opacity="0.16" text-anchor="end">VS</text>`;
        }
        case "gospel": {
            const rays = Array.from({ length: 7 }, (_, i) => {
                const x = 420 + i * 60;
                return `<polygon points="600,0 ${x},630 ${x + 28},630" fill="#ffffff" opacity="0.25"/>`;
            }).join("");
            return `<defs>
                <radialGradient id="g1" cx="50%" cy="-10%" r="75%"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/><stop offset="70%" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
                <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fef3c7"/><stop offset="45%" stop-color="#fde68a"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient>
            </defs>
            <rect width="${W}" height="${H}" fill="url(#bg)"/><rect width="${W}" height="${H}" fill="url(#g1)"/>
            <g clip-path="url(#rayclip)">${rays}</g><defs><clipPath id="rayclip"><polygon points="420,0 780,0 1200,630 0,630"/></clipPath></defs>`;
        }
        case "comedy": {
            const circles: Array<[number, number, number]> = [[80, 80, 90], [1050, 60, 140], [920, 420, 110], [180, 460, 70], [620, 90, 50], [1120, 300, 60], [60, 300, 45]];
            return `<defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#facc15"/><stop offset="100%" stop-color="#f97316"/></linearGradient>
            </defs>
            <rect width="${W}" height="${H}" fill="url(#bg)"/>
            <g fill="#ffffff" opacity="0.25">${circles.map(([x, y, s]) => `<circle cx="${x}" cy="${y}" r="${s / 2}"/>`).join("")}</g>`;
        }
        case "cultural": {
            return `<defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#3b1d0a"/><stop offset="55%" stop-color="#7c2d12"/><stop offset="100%" stop-color="#b45309"/></linearGradient>
                <pattern id="zig" width="100" height="100" patternUnits="userSpaceOnUse"><polygon points="0,100 50,50 100,100 100,100 0,100" fill="#f97316" opacity="0.35"/><polygon points="0,0 50,50 100,0 100,0 0,0" fill="#f97316" opacity="0.35"/></pattern>
            </defs>
            <rect width="${W}" height="${H}" fill="url(#bg)"/>
            <rect y="510" width="${W}" height="120" fill="url(#zig)"/>`;
        }
        default:
            return `<rect width="${W}" height="${H}" fill="#101828"/>`;
    }
}

export async function GET(req: NextRequest) {
    const params = req.nextUrl.searchParams;
    const rawCategory = (params.get("category") || "concert").toLowerCase();
    const slug = DESIGNS[rawCategory] ? rawCategory : "concert";
    const d = DESIGNS[slug];
    const title = (params.get("title") || "African Music Event").slice(0, 90);
    const date = (params.get("date") || "").slice(0, 60);
    const city = (params.get("city") || "").slice(0, 40);
    const branded = params.get("branded") === "1";
    const label = slug.toUpperCase();

    const maxChars = slug === "tour" || slug === "showcase" || slug === "industry" ? 18 : 15;
    const lines = wrapTitle(title, maxChars);
    const fontSize = lines.length <= 1 ? 64 : lines.length === 2 ? 56 : 46;
    const lineHeight = fontSize * 1.12;
    const totalTextH = lines.length * lineHeight + 44;
    const startY = (H - totalTextH) / 2 + fontSize;

    const meta = [date, city].filter(Boolean).join("  ·  ");
    const badgeW = label.length * 15 + 48;
    const badgeX = (W - badgeW) / 2;
    const badgeY = Math.max(48, startY - fontSize - 84);

    const titleEls = lines.map((line, i) => {
        const y = startY + i * lineHeight;
        const shadow = slug === "festival"
            ? `x="603" y="${y + 4}" fill="#7c3aed"`
            : "";
        const main = `<text x="600" y="${y}" text-anchor="middle" font-family="${d.titleFont}" font-size="${fontSize}" font-weight="900" fill="${d.titleFill}" letter-spacing="${d.titleSpacing}" style="text-transform:${d.titleTransform}" ${d.titleSkew ? `transform="${d.titleSkew} 600 ${y}"` : ""} ${d.underline ? `text-decoration="underline" text-decoration-color="${d.underline}"` : ""}>${esc(line)}</text>`;
        return shadow
            ? `<text ${shadow} text-anchor="middle" font-family="${d.titleFont}" font-size="${fontSize}" font-weight="900" letter-spacing="${d.titleSpacing}" style="text-transform:${d.titleTransform}">${esc(line)}</text>` + main
            : main;
    }).join("\n");

    const brandEl = branded
        ? `<text x="600" y="${H - 30}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="800" letter-spacing="3" fill="${slug === "gospel" || slug === "comedy" ? "#451a03" : "#ffffff"}" opacity="0.85">AFROPITCH · OFFICIAL PARTNER EVENT</text>`
        : "";

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${background(slug)}
<g>
<rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="44" rx="22" fill="${d.badgeFill}"/>
<text x="600" y="${badgeY + 30}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="800" letter-spacing="5" fill="${d.badgeText}">${label}</text>
${titleEls}
${meta ? `<text x="600" y="${startY + (lines.length - 1) * lineHeight + 52}" text-anchor="middle" font-family="${d.metaFont}" font-size="28" font-weight="700" letter-spacing="2" fill="${d.metaFill}" opacity="0.95">${esc(meta)}</text>` : ""}
${brandEl}
</g>
</svg>`;

    return new NextResponse(svg, {
        headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public, max-age=31536000, immutable",
        },
    });
}
