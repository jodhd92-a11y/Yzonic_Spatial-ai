import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Distinctive display face for headings, the brand mark, and anywhere
// the UI wants a bit more character than the body font.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Reserved for the (auth) route group — echoes the serif accent used on
// the marketing site so sign-in feels like a continuation of it, not a
// separate product.
const instrumentSerif = Instrument_Serif({
  variable: "--font-auth-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic", "normal"],
});

export const metadata: Metadata = {
  title: "Spatial·AI",
  description: "Clinical & biotech documentation lens — capture wounds, specimens, monitors, and slides with real-world measurement, redaction, and case metadata, then hand it straight to chat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: some browser extensions (password
          managers, ad/tracker blockers, etc.) inject attributes like
          `bis_skin_checked` / `bis_register` / `__processed_*__` into the
          DOM before React hydrates. That's a client-only mutation outside
          our control, not a real mismatch — without this flag React logs
          a hydration warning for every one of those injected attributes. */}
      <body className="h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
