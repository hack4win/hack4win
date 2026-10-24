import type { Metadata } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ModalAlertProvider } from "@/components/ui/modal-alert";
import { PerformanceTimingPatch } from "@/components/providers/performance-timing-patch";

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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "https://br-polished-unit-b3lk45ku.storage.c-4.ap-southeast-1.aws.neon.tech/do4win/branding/hack4win-icon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "https://br-polished-unit-b3lk45ku.storage.c-4.ap-southeast-1.aws.neon.tech/do4win/branding/hack4win-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Hack4Win | The Global Hackathon Platform",
    description: "Join global hackathons, collaborate with top builders, and win prizes on hack4win.online.",
    url: "https://hack4win.online",
    siteName: "Hack4Win",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://br-polished-unit-b3lk45ku.storage.c-4.ap-southeast-1.aws.neon.tech/do4win/branding/hack4win-logo.png",
        width: 512,
        height: 512,
        alt: "Hack4Win Platform Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hack4Win | Hackathon Platform - Build, Showcase & Win",
    description: "Join global hackathons, collaborate with top builders, and win prizes on hack4win.online.",
    creator: "@hack4win",
    site: "@hack4win",
    images: [
      "https://br-polished-unit-b3lk45ku.storage.c-4.ap-southeast-1.aws.neon.tech/do4win/branding/hack4win-logo.png",
    ],
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
        <Script
          id="perf-timing-patch"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined' && window.Performance && !window.__hack4win_perf_patched) {
                  window.__hack4win_perf_patched = true;
                  try {
                    var orig = window.Performance.prototype.measure;
                    window.Performance.prototype.measure = function(name, startOrOpts, endMark) {
                      try {
                        if (startOrOpts && typeof startOrOpts === 'object') {
                          var opts = Object.assign({}, startOrOpts);
                          if (typeof opts.start === 'number' && opts.start < 0) opts.start = 0;
                          if (typeof opts.end === 'number' && opts.end < 0) opts.end = 0;
                          if (typeof opts.start === 'number' && typeof opts.end === 'number' && opts.end < opts.start) {
                            opts.end = opts.start;
                          }
                          if (typeof opts.duration === 'number' && opts.duration < 0) opts.duration = 0;
                          return orig.call(this, name, opts, endMark);
                        }
                        return orig.call(this, name, startOrOpts, endMark);
                      } catch(e) {
                        if (e && (e.name === 'DOMException' || e.name === 'TypeError' || (e.message && (e.message.indexOf('negative') !== -1 || e.message.indexOf('time stamp') !== -1)))) {
                          return;
                        }
                        throw e;
                      }
                    };
                  } catch(e) {}
                }
              })();
            `,
          }}
        />
        <PerformanceTimingPatch />
        <ModalAlertProvider>{children}</ModalAlertProvider>
      </body>
    </html>
  );
}
