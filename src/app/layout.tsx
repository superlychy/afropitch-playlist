import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/../config/site";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AIHelp } from "@/components/AIHelp";

export const metadata: Metadata = {
  title: {
    default: "Afropitch Playlist | Connect African Artists to Real Curators",
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: "Afropitch Playlist | Connect African Artists to Real Curators",
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Afropitch Playlist - Connect Artists to Curators",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Afropitch Playlist | Connect African Artists to Real Curators",
    description: siteConfig.description,
    creator: "@afropitch",
  },
  robots: {
    index: true,
    follow: true,
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
