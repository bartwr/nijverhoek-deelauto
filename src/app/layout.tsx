import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { registerServiceWorker } from "@/lib/sw-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Deelauto Nijverhoek - Gedeelde auto in de buurt",
  description: "Een auto in de buurt, voor de buurt. Je betaalt alleen voor wat je rijdt. Kia e-Niro met 400 km actieradius beschikbaar in de Nijverhoek.",
  keywords: ["deelauto", "gedeelde auto", "Nijverhoek", "elektrische auto", "car sharing"],
  authors: [{ name: "Deelauto Nijverhoek" }],
  manifest: "/manifest.json",
  openGraph: {
    title: "Deelauto Nijverhoek",
    description: "Een auto in de buurt, voor de buurt. Je betaalt alleen voor wat je rijdt.",
    type: "website",
    images: [
      {
        url: "/ladiedada.webp",
        width: 1200,
        height: 630,
        alt: "Deelauto Nijverhoek - Gedeelde auto in de buurt",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Deelauto Nijverhoek",
    description: "Een auto in de buurt, voor de buurt. Je betaalt alleen voor wat je rijdt.",
    images: ["/ladiedada.webp"],
  },
  themeColor: "#ea5c33",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Deelauto Nijverhoek",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Deelauto Nijverhoek",
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-96x96.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-96x96.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
