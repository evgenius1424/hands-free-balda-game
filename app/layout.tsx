import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Hands-Free Balda Game | Игра Балда без рук | balda-game.com",
  description:
    "Play Balda hands-free on your browser! A fun and interactive game to challenge your vocabulary skills. Играйте в Балду без рук в браузере! Увлекательная игра для развития словарного запаса.",
  icons: {
    icon: "/favicon.png",
  },
  keywords: [
    // English keywords
    "Balda",
    "Word Game",
    "Hands-Free Game",
    "Vocabulary Challenge",
    "Web Game",
    "Browser Game",
    "Free Online Game",
    "Word Building",
    "Speech Recognition",
    "Voice Control",

    // Russian keywords - core game terms
    "Балда",
    "балда игра",
    "игра балда",
    "балда онлайн",
    "балда браузер",
    "балда бесплатно",
    "словесная игра",
    "игра в слова",
    "составь слова",
    "слова из букв",

    // Russian - hands-free/voice control
    "игра без рук",
    "голосовое управление",
    "распознавание речи",
    "управление голосом",
    "без клавиатуры",
    "без мыши",

    // Russian - game descriptions
    "развитие словарного запаса",
    "тренировка памяти",
    "интеллектуальная игра",
    "логическая игра",
    "головоломка",
    "онлайн игра",
    "браузерная игра",
    "веб игра",
    "бесплатная игра",

    // Russian - alternative spellings and variations
    "балда игра онлайн",
    "игра балда бесплатно",
    "балда в браузере",
    "русская балда",
    "балда на русском",
    "слова балда",
    "составление слов",
    "игра составь слово",

    // Domain and site specific
    "balda-game.com",
    "balda game",
    "online balda",
    "free balda",
  ],
  applicationName: "Hands-Free Balda",
  authors: [{ name: "evgenius1424" }],
  openGraph: {
    title: "Hands-Free Balda Game | Игра Балда без рук",
    description:
      "Play Balda hands-free on your browser! Играйте в Балду голосом в браузере!",
    url: "https://balda-game.com",
    siteName: "Balda Game",
    locale: "ru_RU",
    alternateLocale: ["en_US"],
    type: "website",
  },
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
