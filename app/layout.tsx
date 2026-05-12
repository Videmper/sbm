import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const bodyFont = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SBC Modern App",
    template: "%s | Sauti Business Community",
  },
  metadataBase: new URL("https://sauti.sautiyamkenya.co.ke"),
  description:
    "Modern Next.js and Supabase foundation for Sauti Business Community — loan operations, savings, sync, and M-PESA in one build.",
  keywords: [
    "SACCO",
    "microfinance",
    "loan management",
    "savings",
    "M-PESA",
    "Supabase",
    "Next.js",
  ],
  authors: [{ name: "Sauti Business Community" }],
  creator: "Sauti Business Community",
  publisher: "Sauti Business Community",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: "https://sauti.sautiyamkenya.co.ke",
    title: "SBC Modern App",
    description:
      "Modern loan management system for Sauti Business Community. Built with Next.js, React 19, TypeScript, and Supabase.",
    siteName: "Sauti Business Community",
  },
  twitter: {
    card: "summary_large_image",
    site: "@sauti_ke",
    title: "SBC Modern App",
    description:
      "Modern loan operations, savings tracking, and M-PESA integration for Sauti Business Community.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#06131f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <meta name="color-scheme" content="dark" />
      </head>
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
