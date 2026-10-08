import type { Metadata } from "next";
import { Fraunces, Inter, Noto_Sans_Devanagari, Noto_Serif_Devanagari } from "next/font/google";
import { getLocale } from "@/i18n/server";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Neither Fraunces nor Inter cover Devanagari glyphs. These load as pure CSS
// fallbacks in the same stacks (see globals.css) — the browser only reaches
// for them per-glyph, so Latin text is completely unaffected and Hindi text
// renders in a matching weight/style instead of a system-default font.
const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-sans-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
});

const notoSerifDevanagari = Noto_Serif_Devanagari({
  variable: "--font-noto-serif-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "DreamIT — Your perfect home is our goal.",
    template: "%s | DreamIT",
  },
  description:
    "A curated selection of properties, presented and shown by our team.",
  openGraph: {
    type: "website",
    siteName: "DreamIT",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${inter.variable} ${notoSansDevanagari.variable} ${notoSerifDevanagari.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-ink font-sans">
        {children}
      </body>
    </html>
  );
}
