import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
  description: "Een auto in de buurt, voor de buurt. Je betaalt alleen voor wat je rijdt. Kia e-Niro met 350 km actieradius beschikbaar in de Nijverhoek.",
  keywords: ["deelauto", "gedeelde auto", "Nijverhoek", "elektrische auto", "car sharing"],
  authors: [{ name: "Deelauto Nijverhoek" }],
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
