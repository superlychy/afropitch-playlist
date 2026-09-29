import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/../config/site";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AIHelp } from "@/components/AIHelp";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { AuthProvider } from "@/context/AuthContext";
import { UserActivityTracker } from "@/components/UserActivityTracker";
import { ErrorReporter } from "@/components/ErrorReporter";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Afropitch Playlist | Connect African Artists to Real Curators",
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: "AfroPitch", url: siteConfig.url }],
  creator: "AfroPitch",
  publisher: "AfroPitch",
  category: "music",
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: "Afropitch Playlist | Connect African Artists to Real Curators",
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 600,
        alt: "AfroPitch Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Afropitch Playlist | Connect African Artists to Real Curators",
    description: siteConfig.description,
    creator: "@afropitch",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <AuthProvider>
          <ToastProvider>
            <Navbar />
            <main className="min-h-screen pt-16 bg-background text-foreground selection:bg-green-500/30">
              {children}
            </main>
            <Footer />
            <AIHelp />
            <AnalyticsTracker />
            <UserActivityTracker />
            <ErrorReporter />
          </ToastProvider>
        </AuthProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${siteConfig.url}#organization`,
                  "name": siteConfig.name,
                  "url": siteConfig.url,
                  "logo": `${siteConfig.url}/logo.png`,
                  "description": siteConfig.description,
                  "slogan": "Connect African artists to real playlist curators",
                  sameAs: [siteConfig.links.twitter, siteConfig.links.instagram],
                  "knowsAbout": [
                    "Afrobeats playlist pitching",
                    "Amapiano playlist promotion",
                    "Francophone African music",
                    "Afro-house music",
                    "Alté music",
                    "African music curation",
                    "Spotify playlist placement",
                    "Independent artist promotion in Africa",
                    "Song mixing and mastering for African artists",
                  ],
                  "areaServed": [
                    { "@type": "Country", "name": "Nigeria" },
                    { "@type": "Country", "name": "Ghana" },
                    { "@type": "Country", "name": "South Africa" },
                    { "@type": "Country", "name": "Kenya" },
                    { "@type": "Country", "name": "Ivory Coast" },
                    { "@type": "Country", "name": "Cameroon" },
                    { "@type": "Place", "name": "Africa" },
                    { "@type": "Place", "name": "Worldwide" },
                  ],
                  "makesOffer": [
                    {
                      "@type": "Offer",
                      "itemOffered": {
                        "@type": "Service",
                        "name": "Playlist pitching to real African music curators",
                        "description":
                          "Submit songs to vetted Spotify, Apple Music, Audiomack and Boomplay playlist curators across Afrobeats, Amapiano, Francophone and Afro-house genres, with a refund policy.",
                      },
                    },
                    {
                      "@type": "Offer",
                      "itemOffered": {
                        "@type": "Service",
                        "name": "Professional song mixing and mastering for African artists",
                        "description":
                          "Radio-ready mixing and mastering packages (Demo Polish, Full Mix, Mix + Master) with escrow-protected payments and revision rounds.",
                      },
                    },
                    {
                      "@type": "Offer",
                      "itemOffered": {
                        "@type": "Service",
                        "name": "Featured artist spotlight",
                        "description":
                          "Editorial spotlight placements (Artist of the Week, Rising Artist, Artist of the Season) that showcase African artists to new audiences.",
                      },
                    },
                  ],
                  contactPoint: {
                    "@type": "ContactPoint",
                    email: siteConfig.contact.email,
                    contactType: "customer support",
                  },
                },
                {
                  "@type": "WebSite",
                  "@id": `${siteConfig.url}#website`,
                  "name": siteConfig.name,
                  "url": siteConfig.url,
                  "publisher": { "@id": `${siteConfig.url}#organization` },
                  "inLanguage": "en",
                },
              ],
            }),
          }}
        />
      </body>
    </html>
  );
}
