import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ModalAlertProvider } from "@/components/ui/modal-alert";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://hack4win.online"),
  title: {
    default: "Hack4Win | Hackathon Platform - Build, Showcase & Win",
    template: "%s | Hack4Win",
  },
  description: "Join global hackathons, collaborate with top builders, and win prizes on hack4win.online.",
  keywords: [
    "hackathons",
    "ai hackathons",
    "web3 challenges",
    "developers",
    "coding competitions",
    "bounties",
    "open source software",
    "tech hackathon",
    "devpost alternative",
    "hack4win",
    "Hack4Win",
  ],
  authors: [{ name: "Hack4Win Team", url: "https://hack4win.online" }],
  creator: "Hack4Win",
  publisher: "Hack4Win",
  category: "Technology",
  alternates: {
    canonical: "./",
  },
  openGraph: {
    title: "Hack4Win | The Global Hackathon Platform",
    description: "Join global hackathons, collaborate with top builders, and win prizes on hack4win.online.",
    url: "https://hack4win.online",
    siteName: "Hack4Win",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hack4Win | Hackathon Platform - Build, Showcase & Win",
    description: "Join global hackathons, collaborate with top builders, and win prizes on hack4win.online.",
    creator: "@hack4win",
    site: "@hack4win",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans antialiased">
        <ModalAlertProvider>{children}</ModalAlertProvider>
      </body>
    </html>
  );
}
