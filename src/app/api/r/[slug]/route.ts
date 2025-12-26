import { NextResponse } from 'next/server';

// ----------------------------------------------------------------------
// MOCK DATABASE & TRACKING LOGIC
// ----------------------------------------------------------------------
// In a real app, 'MOCK_DB' would be a 'LinkTracking' table in your database.
// ----------------------------------------------------------------------

interface LinkData {
    targetUrl: string;
    submissionId: string;
    clicks: number;
}

const MOCK_DB: Record<string, LinkData> = {
    // Matches the mock data in Artist Dashboard (src/app/dashboard/artist/page.tsx)
    'amapiano-vibes-sub1': {
        targetUrl: 'https://open.spotify.com/playlist/37i9dQZF1DWYkaDif7C94p', // Example Spotify Playlist
        submissionId: 'sub_1',
        clicks: 142
    },
    'wizkid-essence-sub2': {
        targetUrl: 'https://open.spotify.com/track/5FG7Tl93LdH117jEKYl3Cm',
        submissionId: 'sub_2',
        clicks: 890
    }
};

export async function GET(
    request: Request,
    context: { params: Promise<{ slug: string }> } // Standard Next.js Route Handler signature
) {
    const { slug } = await context.params;
    const linkEntry = MOCK_DB[slug];

    if (!linkEntry) {
        // Fallback or 404
        return NextResponse.json(
            { error: 'Link not found', message: 'This tracking link is invalid or expired.' },
            { status: 404 }
        );
    }

    // ----------------------------------------------------------------------
    // 1. INCREMENT CLICK COUNT
    // ----------------------------------------------------------------------
    // This is the "Tracking" part. You would run a DB update here.
    // await prisma.linkTracking.update({ where: { slug }, data: { clicks: { increment: 1 } } })
    // ----------------------------------------------------------------------

    linkEntry.clicks++;
    console.log(`[AfroPitch Analytics] +1 Click for Submission ${linkEntry.submissionId} (${slug}). Total: ${linkEntry.clicks}`);

    // ----------------------------------------------------------------------
    // 2. REDIRECT to the actual Playlist/Song
    // ----------------------------------------------------------------------
    return NextResponse.redirect(linkEntry.targetUrl);
}
