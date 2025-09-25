import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Hands-Free Balda Game",
  description:
    "Play Balda hands-free on your browser! A fun and interactive game to challenge your vocabulary skills.",
  keywords: [
    "Balda",
    "Word Game",
    "Hands-Free Game",
    "Vocabulary Challenge",
    "Web Game",
  ],
  applicationName: "Hands-Free Balda",
  authors: [{ name: "evgenius1424" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Analytics />
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
