import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/../config/site";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AIHelp } from "@/components/AIHelp";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: "The #1 African Music Promotion Platform. Free submit your music to top curated Afrobeat, Amapiano, and Francophone African playlists on Spotify, Apple Music, Audiomack, Boomplay, and Deezer.",
  keywords: [
    "African music", "Afrobeats playlist submission", "promote african music",
    "submit music to playlists", "Spotify playlist pitch", "Apple Music promotion",
    "Audiomack playlists", "Boomplay curation", "Deezer playlists",
    "Nigerian music promotion", "Ghanaian music", "South African Amapiano",
    "music marketing africa", "independent artist", "Afropitch",
    "free afrobeat playlist", "paid playlist", "afrobeat", "amapiano",
    "francophone african playlist", "free submit"
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: "AfroPitch | Promote Your African Music to Global Playlists",
    description: "Free submit your songs to top Afrobeat, Amapiano & Francophone African curators on Spotify & Audiomack. Guaranteed reviews and real growth for African artists.",
    siteName: siteConfig.name,
    images: [
      {
        url: "/og-image.jpg", // Ensure this exists or use a placeholder
        width: 1200,
        height: 630,
        alt: "AfroPitch Music Promotion",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AfroPitch | #1 African Music Promotion",
    description: "Get your music heard. Submit to playlists on Spotify, Apple Music, Audiomack & more.",
    creator: "@afropitch",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen pt-16 bg-background text-foreground selection:bg-green-500/30">
            {children}
          </main>
          <Footer />
          <AIHelp />
        </AuthProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": siteConfig.name,
              "url": siteConfig.url,
              "logo": `${siteConfig.url}/logo.png`,
              "sameAs": [
                siteConfig.links.twitter,
                siteConfig.links.instagram
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "email": siteConfig.contact.email,
                "contactType": "customer support"
              }
            })
          }}
        />
      </body>
    </html>
  );
}
