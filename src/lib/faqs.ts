// Shared homepage + /faq page questions. The full list and the FAQPage
// JSON-LD live on /faq (the canonical SEO source); the homepage shows a
// short teaser of the trust-critical questions only.
export interface Faq {
    q: string;
    a: string;
}

export const FAQS: Faq[] = [
    {
        q: "What is Afropitch Playlist?",
        a: "Afropitch is an African playlist pitching platform that connects artists directly with real curators across Afrobeat, Amapiano and Francophone genres.",
    },
    {
        q: "Is Afropitch safe to use?",
        a: "Yes. Afropitch works only with real curators and playlists. No bots, no fake streams, and transparent pitching.",
    },
    {
        q: "Does Afropitch offer free playlists?",
        a: "Yes. Artists can submit to both free and paid playlists on the platform.",
    },
    {
        q: "What happens if my song is not playlisted?",
        a: "Afropitch offers a refund policy if your song does not make it to a playlist (based on platform rules).",
    },
    {
        q: "Can curators make money on Afropitch?",
        a: "Yes. Curators can earn money by accepting song submissions that fit their playlists.",
    },
    {
        q: "What genres does Afropitch support?",
        a: "Afropitch supports Afrobeats, Amapiano, Francophone African music, Afro-house, Alte and emerging African sounds.",
    },
    {
        q: "How does playlist pitching work on Afropitch?",
        a: "Pick a playlist that fits your sound, submit your song with a short pitch, and a real curator reviews it. If your song is accepted, it gets playlisted on Spotify, Apple Music, Audiomack or Boomplay. If not, our refund policy has you covered.",
    },
    {
        q: "Does Afropitch offer song mixing and mastering?",
        a: "Yes. Afropitch offers professional mixing packages for African artists: Demo Polish, Full Mix, and Mix + Master, with escrow-protected payments, watermarked previews, and revision rounds so you only release the final mix when you are happy with it.",
    },
    {
        q: "Which countries do Afropitch curators cover?",
        a: "Our curators cover playlists across Nigeria, Ghana, South Africa, Kenya, Ivory Coast, Cameroon and the wider African diaspora in the UK, US and beyond.",
    },
    {
        q: "How do I get my Amapiano or Francophone song heard?",
        a: "Submit it to a matching playlist on Afropitch. We have dedicated Amapiano, Francophone, Afro-house and Alte playlists run by real curators who listen to every submission.",
    },
    {
        q: "Can I promote my music as an independent or unsigned artist?",
        a: "Absolutely. Afropitch was built for independent and upcoming African artists. No label or connections needed. Submit your music, get heard by real curators, and track your playlist performance.",
    },
];

// The questions that answer a visitor's buying doubts, shown as the
// homepage teaser. Everything else lives on /faq.
export const HOMEPAGE_TEASER_QUESTIONS = [
    "Is Afropitch safe to use?",
    "What happens if my song is not playlisted?",
    "Does Afropitch offer free playlists?",
];

export function faqSchemaJsonLd(faqs: Faq[]) {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.q,
            acceptedAnswer: {
                "@type": "Answer",
                text: faq.a,
            },
        })),
    };
}
