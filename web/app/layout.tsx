import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ogImageUrl } from "@/lib/og";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

const SITE_TITLE = "Network Portal — US Strategy & Ops jobs, scored for you";
const SITE_DESCRIPTION =
  "The fastest way to find Strategy & Operations, BizOps, Corporate Strategy, Growth & Pricing and Strategic Finance roles across the USA. Every posting scored for fit, flagged for visa sponsorship wording and pay, from LinkedIn, Indeed's index, Built In, Greenhouse, Lever, Ashby, Workday, Amazon and Google.";

const SITE_OG_IMAGE = ogImageUrl({
  kind: "site",
  title: "Live US Strategy & Ops jobs",
  subtitle: "Strategy & Ops · Corporate Strategy · Growth & Pricing · Strategic Finance",
  tag: "US strategy jobs",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: "%s · Network Portal" },
  description: SITE_DESCRIPTION,
  applicationName: "Network Portal",
  authors: [{ name: "Network Portal" }],
  keywords: [
    "strategy and operations jobs",
    "bizops jobs",
    "business operations manager jobs",
    "chief of staff jobs",
    "growth strategy jobs",
    "pricing strategy jobs",
    "strategic finance jobs",
    "Austin strategy jobs",
    "remote strategy operations jobs",
  ],
  openGraph: {
    type: "website",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: "Network Portal",
    locale: "en_US",
    images: [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: SITE_TITLE }],
  },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION, images: [SITE_OG_IMAGE] },
  robots: { index: true, follow: true },
  category: "jobs",
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
};

export const viewport: Viewport = { themeColor: "#0D0D10", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="pb-backdrop" aria-hidden="true">
          <div className="pb-bloom pb-bloom--violet" />
          <div className="pb-bloom pb-bloom--teal" />
          <div className="pb-bloom pb-bloom--amber" />
        </div>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
