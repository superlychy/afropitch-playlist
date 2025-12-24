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
  description: siteConfig.description,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
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
