import type { Metadata } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ModalAlertProvider } from "@/components/ui/modal-alert";
import { PerformanceTimingPatch } from "@/components/providers/performance-timing-patch";

import {
  SITE_URL,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  TWITTER_HANDLE,
  PRIMARY_KEYWORDS,
  BRAND_ASSETS,
} from "@/lib/seo/config";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: `Hack4Win | ${SITE_TAGLINE}`,
    template: "%s | Hack4Win",
  },
  description: SITE_DESCRIPTION,
  keywords: PRIMARY_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: "Hack4Win Engineering Team", url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "Technology",
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=4", sizes: "any" },
      { url: "/icon-32x32.png?v=4", sizes: "32x32", type: "image/png" },
      { url: "/icon-16x16.png?v=4", sizes: "16x16", type: "image/png" },
      { url: "/icon.png?v=4", sizes: "192x192", type: "image/png" },
      { url: BRAND_ASSETS.iconPng, type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=4",
    apple: [
      { url: "/apple-icon.png?v=4", sizes: "180x180", type: "image/png" },
      { url: BRAND_ASSETS.iconPng, sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: `Hack4Win | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: BRAND_ASSETS.logoPng,
        width: 512,
        height: 512,
        alt: "Hack4Win Platform Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Hack4Win | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    creator: TWITTER_HANDLE,
    site: TWITTER_HANDLE,
    images: [BRAND_ASSETS.logoPng],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
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
