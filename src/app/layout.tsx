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
  description: "The #1 African Music Promotion Platform. Submit your music to top curated playlists on Spotify, Apple Music, Audiomack, Boomplay, and Deezer. Reach millions of listeners in Nigeria, Ghana, South Africa, and globally.",
  keywords: [
    "African music", "Afrobeats playlist submission", "promote african music",
    "submit music to playlists", "Spotify playlist pitch", "Apple Music promotion",
    "Audiomack playlists", "Boomplay curation", "Deezer playlists",
    "Nigerian music promotion", "Ghanaian music", "South African Amapiano",
    "music marketing africa", "independent artist", "Afropitch"
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: "AfroPitch | Promote Your African Music to Global Playlists",
    description: "Submit your songs to top curators on Spotify, Apple Music, Audiomack, Boomplay & Deezer. Guaranteed reviews and real growth for African artists.",
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
      </body>
    </html>
  );
}
